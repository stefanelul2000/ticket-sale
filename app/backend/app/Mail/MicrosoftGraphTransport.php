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
 * No mailbox password is stored; restrict the app to the sender mailbox in Exchange.
 */
class MicrosoftGraphTransport extends AbstractTransport
{
    public function __construct(
        private readonly string $tenantId,
        private readonly string $clientId,
        private readonly string $clientSecret,
        private readonly string $sender,
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
            $response = Http::asForm()->timeout(20)->post(
                'https://login.microsoftonline.com/'.rawurlencode($this->tenantId).'/oauth2/v2.0/token',
                [
                    'client_id' => $this->clientId,
                    'client_secret' => $this->clientSecret,
                    'scope' => 'https://graph.microsoft.com/.default',
                    'grant_type' => 'client_credentials',
                ],
            );
            $token = $response->json('access_token');
            if (! $response->successful() || ! is_string($token)) {
                $code = $response->json('error') ?? 'HTTP '.$response->status();
                throw new RuntimeException("Microsoft Entra token request failed: {$code}");
            }

            return $token;
        });
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
