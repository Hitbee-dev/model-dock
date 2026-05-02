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

export function renderSignupPage(apiUrl: string): string {
  return htmlPage(
    "ModelDock signup",
    `<main>
  <h1>Request access</h1>
  <form method="post" action="${apiUrl}/auth/signup">
    <label>Email <input type="email" name="email" autocomplete="email" required></label>
    <label>Name <input type="text" name="displayName" autocomplete="name"></label>
    <button type="submit">Request approval</button>
  </form>
</main>`
  );
}

export function renderHomePage(): string {
  return htmlPage(
    "ModelDock",
    `<main>
  <h1>ModelDock</h1>
  <p>Self-hosted LLM service control plane.</p>
  <a href="/signup">Request access</a>
</main>`
  );
}
