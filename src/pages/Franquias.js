export default function Franquias() {
  return (
    <div>
      <h2 style={styles.pageTitle}>Franquias</h2>
      <p style={styles.desc}>Gerencie as franquias do seu canal.</p>
    </div>
  )
}

const styles = {
  pageTitle: { fontSize: 24, fontWeight: 700, color: '#0f1b2d', margin: '0 0 8px' },
  desc: { color: '#6b7280', margin: 0 },
}
