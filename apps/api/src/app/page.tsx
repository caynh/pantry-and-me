export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: 720 }}>
      <h1>pantry&amp;me API</h1>
      <p>Backend for the pantry&amp;me mobile app.</p>
      <ul>
        <li>
          <a href="/api/health">GET /api/health</a>
        </li>
        <li>POST /api/recipes/search — search recipe articles by ingredients</li>
        <li>POST /api/account — delete the signed-in account</li>
        <li>
          <a href="/privacy">Privacy policy</a>
        </li>
      </ul>
    </main>
  );
}
