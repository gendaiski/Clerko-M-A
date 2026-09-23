<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
    body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #0f172a; line-height: 1.5; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #64748b; font-size: 10px; margin-bottom: 18px; }
    h2 { font-size: 12px; margin: 14px 0 4px; }
    .signature { margin-top: 28px; border-top: 1px solid #cbd5e1; padding-top: 12px; }
    .signature td { padding: 3px 12px 3px 0; vertical-align: top; }
    .hash { font-family: DejaVu Sans Mono, monospace; font-size: 8px; color: #64748b; word-break: break-all; }
</style>
</head>
<body>
    <h1>{{ $nda['title'] }}</h1>
    <div class="meta">Clerko M&amp;A · NDA version {{ $nda['version'] }}</div>

    @foreach ($nda['clauses'] as $i => $clause)
        <h2>{{ $i + 1 }}. {{ $clause['heading'] }}</h2>
        <p>{{ $clause['body'] }}</p>
    @endforeach

    <div class="signature">
        <table>
            <tr><td><strong>Signed by</strong></td><td>{{ $signedName }}</td></tr>
            <tr><td><strong>Account</strong></td><td>{{ $email }} ({{ $alias }})</td></tr>
            <tr><td><strong>Signed at</strong></td><td>{{ $signedAt->copy()->timezone(config('clerko.display_timezone'))->format('j F Y, H:i') }} (Bahrain time)</td></tr>
            <tr><td><strong>IP address</strong></td><td>{{ $ip }}</td></tr>
            <tr><td><strong>Document hash</strong></td><td class="hash">SHA-256 {{ $hash }}</td></tr>
        </table>
    </div>
</body>
</html>
