export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <p>© 2026 Unkad Labs · Mogadishu, Somalia</p>
        <p>
          <a href="https://unkad.com">unkad.com</a> · Data released under CC BY-SA 4.0
        </p>
        {/* VERIFY SOMALI: "words are wealth" */}
        <p lang="so" style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
          Ereyada waa hanti.
        </p>
      </div>
    </footer>
  );
}
