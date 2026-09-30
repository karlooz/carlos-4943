const TEST_SCENARIOS = [
  { card: '1234 1234 1234 1234', detail: '12/26 · CVV 543', result: 'Aprobada' },
  { card: '1234 1234 1234 1234', detail: 'CVV distinto de 543', result: 'CVV incorrecto' },
  { card: '4000 0000 0000 0002', detail: 'fecha futura', result: 'Fondos insuficientes' },
  { card: '4000 0000 0000 0119', detail: 'fecha futura', result: 'Riesgo / fraude' },
  { card: 'cualquier otra', detail: 'fecha pasada', result: 'Tarjeta vencida' },
  { card: 'cualquiera', detail: 'monto > $10,000', result: 'Límite excedido' },
  { card: '5000 0000 0000 0001', detail: 'fecha futura', result: 'Error del sistema' },
  { card: '5000 0000 0000 0019', detail: 'fecha futura', result: 'Timeout' },
] as const;

/** Ayuda visible solo en esta demo para reproducir cada respuesta simulada. */
export function TestCardsHint() {
  return (
    <details className="test-cards">
      <summary>Ver tarjetas de prueba (datos ficticios)</summary>
      <table className="test-cards__table">
        <thead>
          <tr>
            <th scope="col">Tarjeta</th>
            <th scope="col">Datos</th>
            <th scope="col">Resultado</th>
          </tr>
        </thead>
        <tbody>
          {TEST_SCENARIOS.map((scenario) => (
            <tr key={`${scenario.card}-${scenario.result}`}>
              <td className="mono">{scenario.card}</td>
              <td>{scenario.detail}</td>
              <td>{scenario.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
