<?php

namespace App\Mail;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Symfony\Component\Mailer\SentMessage;
use Symfony\Component\Mailer\Transport\AbstractTransport;
use Symfony\Component\Mime\Address;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\MessageConverter;
use Symfony\Component\Mime\Part\DataPart;

/**
 * Sends mail through Microsoft Graph (POST /users/{sender}/sendMail) with an Entra ID
 * app registration (client-credentials flow, application permission Mail.Send).
 * Authenticates with a certificate (signed client assertion, preferred) or a client secret.
 * No mailbox password is stored; restrict the app to the sender mailbox in Exchange.
 */
class MicrosoftGraphTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $tenantId,
        private readonly string $clientId,
        private readonly ?string $clientSecret,
        private readonly string $sender,
        private readonly ?string $certPath = null,
        private readonly ?string $keyPath = null,
    ) {
        parent::__construct();
    }

    public function __toString(): string
    {
        return 'microsoft-graph';
    }

    protected function doSend(SentMessage $message): void
    {
        $email = MessageConverter::toEmail($message->getOriginalMessage());

        $payload = [
            'message' => [
                'subject' => (string) $email->getSubject(),
                'body' => $email->getHtmlBody() !== null
                    ? ['contentType' => 'HTML', 'content' => (string) $email->getHtmlBody()]
                    : ['contentType' => 'Text', 'content' => (string) $email->getTextBody()],
                'toRecipients' => $this->recipients($email->getTo()),
                'ccRecipients' => $this->recipients($email->getCc()),
                'bccRecipients' => $this->recipients($email->getBcc()),
                'replyTo' => $this->recipients($email->getReplyTo()),
                'attachments' => array_map(fn (DataPart $part) => $this->attachment($part), $email->getAttachments()),
            ],
            'saveToSentItems' => true,
        ];

        $response = Http::withToken($this->token())
            ->acceptJson()
            ->timeout(30)
            ->post('https://graph.microsoft.com/v1.0/users/'.rawurlencode($this->sender).'/sendMail', $payload);

        if ($response->status() === 401) {
            Cache::forget($this->cacheKey());
        }
        if (! $response->successful()) {
            $code = $response->json('error.code') ?? 'HTTP '.$response->status();
            throw new RuntimeException("Microsoft Graph sendMail failed: {$code}");
        }
    }

    private function token(): string
    {
        return Cache::remember($this->cacheKey(), now()->addMinutes(50), function () {
            $endpoint = 'https://login.microsoftonline.com/'.rawurlencode($this->tenantId).'/oauth2/v2.0/token';
            $form = [
                'client_id' => $this->clientId,
                'scope' => 'https://graph.microsoft.com/.default',
                'grant_type' => 'client_credentials',
            ];
            if ($this->certPath && $this->keyPath) {
                $form['client_assertion_type'] = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
                $form['client_assertion'] = $this->clientAssertion($endpoint);
            } else {
                $form['client_secret'] = (string) $this->clientSecret;
            }
            $response = Http::asForm()->timeout(20)->post($endpoint, $form);
            $token = $response->json('access_token');
            if (! $response->successful() || ! is_string($token)) {
                $code = $response->json('error') ?? 'HTTP '.$response->status();
                throw new RuntimeException("Microsoft Entra token request failed: {$code}");
            }

            return $token;
        });
    }

    /**
     * RS256-signed JWT proving possession of the certificate's private key
     * (Microsoft identity platform "certificate credentials").
     */
    private function clientAssertion(string $audience): string
    {
        $certPem = @file_get_contents((string) $this->certPath);
        $keyPem = @file_get_contents((string) $this->keyPath);
        if (! $certPem || ! $keyPem) {
            throw new RuntimeException('Microsoft Graph mailer: certificate or key file not readable');
        }
        if (! preg_match('/-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----/s', $certPem, $m)) {
            throw new RuntimeException('Microsoft Graph mailer: certificate file is not PEM');
        }
        $der = base64_decode(preg_replace('/\s+/', '', $m[1]), true);
        $key = openssl_pkey_get_private($keyPem);
        if ($der === false || $key === false) {
            throw new RuntimeException('Microsoft Graph mailer: invalid certificate or private key');
        }

        $b64 = fn (string $v) => rtrim(strtr(base64_encode($v), '+/', '-_'), '=');
        $now = time();
        $header = ['alg' => 'RS256', 'typ' => 'JWT', 'x5t#S256' => $b64(hash('sha256', $der, true))];
        $claims = [
            'aud' => $audience,
            'iss' => $this->clientId,
            'sub' => $this->clientId,
            'jti' => bin2hex(random_bytes(16)),
            'nbf' => $now - 30,
            'iat' => $now,
            'exp' => $now + 600,
        ];
        $input = $b64(json_encode($header)).'.'.$b64(json_encode($claims));
        if (! openssl_sign($input, $signature, $key, OPENSSL_ALGO_SHA256)) {
            throw new RuntimeException('Microsoft Graph mailer: signing failed');
        }

        return $input.'.'.$b64($signature);
    }

    private function cacheKey(): string
    {
        return 'msgraph-token:'.sha1($this->tenantId.'|'.$this->clientId);
    }

    /**
     * @param  Address[]  $addresses
     */
    private function recipients(array $addresses): array
    {
        return array_map(fn (Address $a) => ['emailAddress' => array_filter([
            'address' => $a->getAddress(),
            'name' => $a->getName() ?: null,
        ])], $addresses);
    }

    private function attachment(DataPart $part): array
    {
        $headers = $part->getPreparedHeaders();
        $disposition = $headers->getHeaderBody('Content-Disposition') ?? 'attachment';
        $inline = str_starts_with(strtolower((string) $disposition), 'inline');
        $name = $part->getFilename() ?? 'attachment';

        return array_filter([
            '@odata.type' => '#microsoft.graph.fileAttachment',
            'name' => $name,
            'contentType' => $part->getMediaType().'/'.$part->getMediaSubtype(),
            'contentBytes' => base64_encode($part->getBody()),
            'isInline' => $inline,
            'contentId' => $inline && $part->hasContentId() ? $part->getContentId() : null,
        ], fn ($v) => $v !== null);
    }
}
