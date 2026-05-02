function htmlPage(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body>
${body}
</body>
</html>`;
}

export function renderApprovalsPage(apiUrl: string): string {
  return htmlPage(
    "ModelDock approvals",
    `<main>
  <h1>Pending approvals</h1>
  <p>Approve signup requests from the protected admin host only.</p>
  <form method="get" action="${apiUrl}/admin/approvals">
    <button type="submit">Load pending requests</button>
  </form>
</main>`
  );
}
