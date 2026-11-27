<?php

namespace Tests\Feature;

use App\Mail\ETicketMail;
use App\Mail\NewRequestMail;
use App\Mail\RequestDeclinedMail;
use App\Models\Event;
use App\Models\Ticket;
use App\Models\TicketRequest;
use App\Support\Organization;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class TicketRequestTest extends TestCase
{
    use RefreshDatabase;

    private Event $event;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedRoles();
        [$event, $type] = $this->eventWithType(150);
        $this->actingAs($this->userWithRole(4))->postJson('/api/tickets/generate', ['event_id' => $event->id, 'ticket_type_id' => $type->id, 'count' => 150])->assertOk();
        $event->update(['requests_enabled' => true, 'eticket_from' => 101, 'eticket_to' => 150, 'request_max' => 4, 'is_public' => true]);
        $this->event = $event->fresh();
        auth()->guard('web')->logout();
        $this->flushSession();
    }

    private function ask(array $over = [])
    {
        return $this->postJson("/api/public/events/{$this->event->slug}/requests", array_merge([
            'email' => 'Parinte@Example.com',
            'phone' => '+40 770 000 000',
            'attendees' => ['Maria Popescu', 'Ion Popescu'],
            'message' => 'Venim cu bunica',
            'consent' => true,
            'locale' => 'ro',
        ], $over));
    }

    public function test_public_request_is_stored_pending_and_org_notified(): void
    {
        Mail::fake();
        Organization::save(['request_notify_email' => 'office@example.org']);

        $this->getJson("/api/public/events/{$this->event->slug}")->assertJson(['requests_open' => true, 'request_max' => 4]);
        $this->ask()->assertCreated()->assertExactJson(['status' => 'received']);

        $req = TicketRequest::first();
        $this->assertSame('pending', $req->status);
        $this->assertSame('parinte@example.com', $req->email);
        $this->assertSame(['Maria Popescu', 'Ion Popescu'], $req->attendees);
        $this->assertSame(2, $req->quantity);
        Mail::assertSent(NewRequestMail::class, fn ($m) => $m->hasTo('office@example.org'));
    }

    public function test_request_rules(): void
    {
        $this->ask(['attendees' => ['A', 'B', 'C', 'D', 'E']])->assertStatus(422);
        $this->ask(['attendees' => ["Evil\r\nBcc: x@y.z"]])->assertStatus(422);
        $this->ask(['consent' => false])->assertStatus(422);
        $this->ask(['email' => 'not-an-email'])->assertStatus(422);

        // honeypot: looks fine to the bot, stores nothing
        $this->ask(['website' => 'http://spam'])->assertCreated();
        $this->assertSame(0, TicketRequest::count());

        $this->ask()->assertCreated();
        $this->ask()->assertStatus(409)->assertJson(['result' => 'duplicate']);

        $this->event->update(['requests_enabled' => false]);
        $this->ask(['email' => 'other@example.com'])->assertNotFound();
    }

    public function test_requests_close_when_pool_is_reserved(): void
    {
        $this->event->update(['eticket_from' => 149, 'eticket_to' => 150]);
        $this->ask(['attendees' => ['A', 'B', 'C']])->assertStatus(409)->assertJson(['result' => 'full', 'available' => 2]);
        $this->ask(['attendees' => ['A', 'B']])->assertCreated();
        $this->getJson("/api/public/events/{$this->event->slug}")->assertJson(['requests_open' => false]);
    }

    public function test_approve_assigns_named_tickets_from_the_reserved_range(): void
    {
        $this->ask()->assertCreated();
        $req = TicketRequest::first();
        $manager = $this->userWithRole(4);

        // #101 was handed out on paper meanwhile -> skipped
        Ticket::where('event_id', $this->event->id)->where('ticket_number', 101)->update(['sold_at' => now(), 'name' => 'Paper guest']);

        $this->actingAs($this->userWithRole(3))->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['X']])->assertForbidden();
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['A', 'B', 'C']])->assertStatus(422);

        $res = $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Maria Popescu', 'Ion Popescu'], 'guest_category' => 'family'])
            ->assertOk()->assertJson(['status' => 'approved']);
        $this->assertSame([102, 103], collect($res->json('tickets'))->pluck('ticket_number')->sort()->values()->all());

        $t = Ticket::where('request_id', $req->id)->orderBy('ticket_number')->get();
        $this->assertSame(['Maria Popescu', 'Ion Popescu'], $t->pluck('name')->all());
        $this->assertSame('family', $t[0]->guest_category);
        $this->assertNotNull($t[0]->sold_at);

        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Z']])->assertStatus(409);

        // e-tickets work at the door like any assigned ticket
        $this->actingAs($this->userWithRole(2))->postJson("/api/tickets/{$t[0]->ticket_code}/checkin", ['event_id' => $this->event->id])->assertOk();
        $this->actingAs($manager)->getJson("/api/stats?event_id={$this->event->id}")->assertJson(['etickets' => 2]);
        $this->actingAs($manager)->getJson("/api/tickets?event_id={$this->event->id}&status=eticket")->assertJsonPath('total', 2);
    }

    public function test_send_emails_the_etickets_with_optional_designs(): void
    {
        Mail::fake();
        $this->ask()->assertCreated();
        $req = TicketRequest::first();
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/send")->assertStatus(409); // not approved yet
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Maria Popescu', 'Ion Popescu']])->assertOk();

        $this->actingAs($manager)->post("/api/requests/{$req->id}/send", [
            'designs' => [UploadedFile::fake()->image('a.jpg', 800, 280), UploadedFile::fake()->image('b.jpg', 800, 280)],
        ], ['Accept' => 'application/json'])->assertOk()->assertJson(['send_count' => 1]);

        Mail::assertSent(ETicketMail::class, fn (ETicketMail $m) => $m->hasTo('parinte@example.com') && $m->tickets->count() === 2 && count($m->designs) === 2);
        $this->assertNotNull($req->fresh()->sent_at);

        $this->actingAs($manager)->post("/api/requests/{$req->id}/send", [
            'designs' => [UploadedFile::fake()->createWithContent('x.jpg', '<?php echo 1;')],
        ], ['Accept' => 'application/json'])->assertStatus(422);

        config(['mail.default' => 'log']);
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/send")->assertStatus(409)->assertJson(['result' => 'mail_not_configured']);
    }

    public function test_reject_and_cancel(): void
    {
        Mail::fake();
        $this->ask()->assertCreated();
        $this->ask(['email' => 'b@example.com', 'attendees' => ['Bogdan']])->assertCreated();
        [$r1, $r2] = TicketRequest::orderBy('id')->get()->all();
        $manager = $this->userWithRole(4);

        $this->actingAs($manager)->postJson("/api/requests/{$r2->id}/reject", ['note' => 'Sala e plină', 'notify' => true])->assertOk()->assertJson(['notified' => true]);
        Mail::assertSent(RequestDeclinedMail::class, fn ($m) => $m->hasTo('b@example.com'));
        $this->assertSame('rejected', $r2->fresh()->status);

        $this->actingAs($manager)->postJson("/api/requests/{$r1->id}/approve", ['attendees' => ['Maria Popescu', 'Ion Popescu']])->assertOk();
        $this->actingAs($manager)->postJson("/api/requests/{$r1->id}/cancel")->assertOk()->assertJson(['released' => 2]);
        $this->assertSame(0, Ticket::whereNotNull('request_id')->count());
        $this->assertSame(50, $this->event->eticketPool()->count());

        $list = $this->actingAs($manager)->getJson("/api/events/{$this->event->id}/requests?status=all")->assertOk();
        $this->assertSame(['pending' => 0, 'approved' => 0, 'rejected' => 1, 'cancelled' => 1], $list->json('counts'));
        $this->assertArrayNotHasKey('ip_hash', $list->json('requests.0'));
    }

    public function test_microsoft_graph_transport_sends_with_inline_qr_codes(): void
    {
        config([
            'mail.default' => 'microsoft-graph',
            'mail.mailers.microsoft-graph' => [
                'transport' => 'microsoft-graph', 'tenant_id' => 'tenant-1', 'client_id' => 'client-1',
                'client_secret' => 'secret-1', 'sender' => 'office@example.org',
            ],
            'mail.from' => ['address' => 'office@example.org', 'name' => 'Atelier'],
        ]);
        Http::fake([
            'login.microsoftonline.com/*' => Http::response(['access_token' => 'tok-123', 'expires_in' => 3600]),
            'graph.microsoft.com/*' => Http::response(null, 202),
        ]);

        $this->ask()->assertCreated();
        $req = TicketRequest::first();
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Maria Popescu', 'Ion Popescu']])->assertOk();
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/send")->assertOk();

        Http::assertSent(fn ($r) => str_contains($r->url(), 'login.microsoftonline.com/tenant-1/oauth2/v2.0/token')
            && $r['grant_type'] === 'client_credentials' && $r['scope'] === 'https://graph.microsoft.com/.default');
        Http::assertSent(function ($r) {
            if (! str_contains($r->url(), 'graph.microsoft.com/v1.0/users/office%40example.org/sendMail')) {
                return false;
            }
            $msg = $r['message'];
            $inline = collect($msg['attachments'])->where('isInline', true);

            return $r->hasHeader('Authorization', 'Bearer tok-123')
                && $msg['toRecipients'][0]['emailAddress']['address'] === 'parinte@example.com'
                && str_contains($msg['subject'], 'E-biletul tău')
                && $msg['body']['contentType'] === 'HTML'
                && str_contains($msg['body']['content'], 'Maria Popescu')
                && $inline->count() >= 2
                && $inline->every(fn ($a) => ! empty($a['contentId']) && str_contains($msg['body']['content'], 'cid:'.$a['contentId']));
        });
    }

    public function test_graph_errors_are_reported_without_secrets(): void
    {
        config([
            'mail.default' => 'microsoft-graph',
            'mail.mailers.microsoft-graph' => ['transport' => 'microsoft-graph', 'tenant_id' => 't', 'client_id' => 'c', 'client_secret' => 'super-secret', 'sender' => 'office@example.org'],
        ]);
        Http::fake(['login.microsoftonline.com/*' => Http::response(['error' => 'invalid_client'], 401)]);

        $this->ask()->assertCreated();
        $req = TicketRequest::first();
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Maria Popescu']])->assertOk();
        $res = $this->actingAs($manager)->postJson("/api/requests/{$req->id}/send")->assertStatus(502);

        $this->assertStringContainsString('invalid_client', $res->json('message'));
        $this->assertStringNotContainsString('super-secret', $res->getContent());
        $this->assertStringContainsString('invalid_client', $req->fresh()->send_error);
    }

    public function test_graph_transport_authenticates_with_a_certificate(): void
    {
        // Throwaway key + self-signed certificate, like the one used in production.
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        $cert = openssl_csr_sign(openssl_csr_new(['commonName' => 'test-eticket'], $key), null, $key, 30);
        openssl_x509_export($cert, $certPem);
        openssl_pkey_export($key, $keyPem);
        $dir = sys_get_temp_dir().'/msgraph-'.bin2hex(random_bytes(4));
        mkdir($dir);
        file_put_contents("{$dir}/c.crt", $certPem);
        file_put_contents("{$dir}/c.key", $keyPem);

        config([
            'mail.default' => 'microsoft-graph',
            'mail.mailers.microsoft-graph' => [
                'transport' => 'microsoft-graph', 'tenant_id' => 'tenant-9', 'client_id' => 'client-9',
                'client_secret' => null, 'cert_path' => "{$dir}/c.crt", 'key_path' => "{$dir}/c.key", 'sender' => 'office@example.org',
            ],
        ]);
        Http::fake([
            'login.microsoftonline.com/*' => Http::response(['access_token' => 'tok-cert', 'expires_in' => 3600]),
            'graph.microsoft.com/*' => Http::response(null, 202),
        ]);

        $this->ask(['attendees' => ['Maria Popescu']])->assertCreated();
        $req = TicketRequest::first();
        $manager = $this->userWithRole(4);
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/approve", ['attendees' => ['Maria Popescu']])->assertOk();
        $this->actingAs($manager)->postJson("/api/requests/{$req->id}/send")->assertOk();

        $b64d = fn (string $v) => base64_decode(strtr($v, '-_', '+/').str_repeat('=', (4 - strlen($v) % 4) % 4));
        Http::assertSent(function ($r) use ($b64d, $certPem) {
            if (! str_contains($r->url(), 'login.microsoftonline.com/tenant-9/oauth2/v2.0/token')) {
                return false;
            }
            $this->assertArrayNotHasKey('client_secret', $r->data());
            $this->assertSame('urn:ietf:params:oauth:client-assertion-type:jwt-bearer', $r['client_assertion_type']);
            [$h, $c, $sig] = explode('.', $r['client_assertion']);
            $header = json_decode($b64d($h), true);
            $claims = json_decode($b64d($c), true);
            preg_match('/-----BEGIN CERTIFICATE-----(.+?)-----END CERTIFICATE-----/s', $certPem, $m);
            $der = base64_decode(preg_replace('/\s+/', '', $m[1]));

            $this->assertSame('RS256', $header['alg']);
            $this->assertSame(hash('sha256', $der, true), $b64d($header['x5t#S256']));
            $this->assertSame('client-9', $claims['iss']);
            $this->assertSame('client-9', $claims['sub']);
            $this->assertStringEndsWith('/tenant-9/oauth2/v2.0/token', $claims['aud']);
            $this->assertGreaterThan(time(), $claims['exp']);
            $this->assertSame(1, openssl_verify("{$h}.{$c}", $b64d($sig), openssl_pkey_get_public($certPem), OPENSSL_ALGO_SHA256));

            return true;
        });
        Http::assertSent(fn ($r) => str_contains($r->url(), 'graph.microsoft.com') && $r->hasHeader('Authorization', 'Bearer tok-cert'));
    }
}
