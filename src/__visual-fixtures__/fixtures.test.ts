import {
  empresasFixture,
  categoriasFixture,
  lancamentosFixture,
  fixtureUser,
  fixtureSession,
  CATEGORIA_DESCONHECIDA_ID,
  EMPRESA_ALFA_ID,
  EMPRESA_BETA_ID,
} from '.';

describe('fixtures sintéticas — Microgate 09-C', () => {
  test('usuário fictício autenticado possui sessão determinística', () => {
    expect(fixtureUser.id).toBeTruthy();
    expect(fixtureSession.user).toBe(fixtureUser);
    expect(fixtureSession.access_token).toBeTruthy();
  });

  test('existem exatamente duas empresas fictícias ativas', () => {
    expect(empresasFixture).toHaveLength(2);
    expect(empresasFixture.every((empresa) => empresa.ativo)).toBe(true);
    expect(new Set(empresasFixture.map((e) => e.id)).size).toBe(2);
  });

  test('categorias fictícias cobrem crédito e débito', () => {
    const tipos = new Set(categoriasFixture.map((c) => c.tipo));
    expect(tipos.has('credito')).toBe(true);
    expect(tipos.has('debito')).toBe(true);
  });

  test('cenário: receita recebida está presente', () => {
    const achado = lancamentosFixture.find(
      (l) => l.tipo === 'credito' && l.status === 'recebido' && l.data_pagamento !== null,
    );
    expect(achado).toBeDefined();
  });

  test('cenário: receita pendente está presente', () => {
    const achado = lancamentosFixture.find(
      (l) => l.tipo === 'credito' && l.status === 'pendente' && l.data_pagamento === null,
    );
    expect(achado).toBeDefined();
  });

  test('cenário: despesa paga está presente', () => {
    const achado = lancamentosFixture.find(
      (l) => l.tipo === 'debito' && l.status === 'pago' && l.data_pagamento !== null,
    );
    expect(achado).toBeDefined();
  });

  test('cenário: despesa pendente está presente', () => {
    const achado = lancamentosFixture.find(
      (l) => l.tipo === 'debito' && l.status === 'pendente' && l.data_pagamento === null,
    );
    expect(achado).toBeDefined();
  });

  test('cenário: recebível vencido está presente', () => {
    const achado = lancamentosFixture.find((l) => l.tipo === 'credito' && l.status === 'vencido');
    expect(achado).toBeDefined();
  });

  test('cenário: obrigação vencida está presente', () => {
    const achado = lancamentosFixture.find((l) => l.tipo === 'debito' && l.status === 'vencido');
    expect(achado).toBeDefined();
  });

  test('cenário: lançamento cancelado está presente', () => {
    const achado = lancamentosFixture.find((l) => l.status === 'cancelado');
    expect(achado).toBeDefined();
  });

  test('cenário: parcelamento reconcilia o total em centavos inteiros', () => {
    const parcelas = lancamentosFixture.filter((l) => l.tipo_recorrencia === 'parcelas');
    expect(parcelas).toHaveLength(3);

    const valorParcelaCentavos = Math.round(parcelas[0].valor * 100);
    const valorTotalCentavos = Math.round(parcelas[0].valor_total * 100);
    const somaCentavos = parcelas.reduce((soma, p) => soma + Math.round(p.valor * 100), 0);

    expect(valorParcelaCentavos * parcelas.length).toBe(valorTotalCentavos);
    expect(somaCentavos).toBe(valorTotalCentavos);
    parcelas.forEach((parcela, indice) => {
      expect(parcela.parcela_atual).toBe(indice + 1);
      expect(parcela.numero_parcelas).toBe(3);
    });
  });

  test('cenário: recebimento em mês diferente do vencimento', () => {
    const achado = lancamentosFixture.find(
      (l) =>
        l.status === 'recebido' &&
        l.data_pagamento !== null &&
        l.data_pagamento!.slice(0, 7) !== l.data_vencimento.slice(0, 7),
    );
    expect(achado).toBeDefined();
  });

  test('cenário: pagamento registrado após a data de vencimento', () => {
    const achado = lancamentosFixture.find(
      (l) => l.status === 'pago' && l.data_pagamento !== null && l.data_pagamento! > l.data_vencimento,
    );
    expect(achado).toBeDefined();
  });

  test('cenário: competências distintas cobrem mais de um período', () => {
    const competencias = new Set(lancamentosFixture.map((l) => l.competencia));
    expect(competencias.size).toBeGreaterThan(1);
  });

  test('cenário: categoria desconhecida referenciada não existe no cadastro', () => {
    const achado = lancamentosFixture.find((l) => l.categoria_id === CATEGORIA_DESCONHECIDA_ID);
    expect(achado).toBeDefined();
    expect(categoriasFixture.some((c) => c.id === CATEGORIA_DESCONHECIDA_ID)).toBe(false);
  });

  test('cenário: registro inconsistente (pendente com data de pagamento) está documentado', () => {
    const achado = lancamentosFixture.find((l) => l.status === 'pendente' && l.data_pagamento !== null);
    expect(achado).toBeDefined();
  });

  test('filtro por empresa aplicado sobre as fixtures retorna apenas registros daquela empresa', () => {
    const daAlfa = lancamentosFixture.filter((l) => l.empresa_id === EMPRESA_ALFA_ID);
    const daBeta = lancamentosFixture.filter((l) => l.empresa_id === EMPRESA_BETA_ID);
    expect(daAlfa.length).toBeGreaterThan(0);
    expect(daBeta.length).toBeGreaterThan(0);
    expect(daAlfa.length + daBeta.length).toBe(lancamentosFixture.length);
  });

  test('filtro por período (competência) aplicado sobre as fixtures restringe o conjunto', () => {
    const todasCompetencias = new Set(lancamentosFixture.map((l) => l.competencia));
    const [primeiraCompetencia] = Array.from(todasCompetencias).sort();
    const filtrados = lancamentosFixture.filter((l) => l.competencia === primeiraCompetencia);
    expect(filtrados.length).toBeGreaterThan(0);
    expect(filtrados.length).toBeLessThan(lancamentosFixture.length);
  });

  test('todos os lançamentos pertencem a uma empresa fictícia cadastrada', () => {
    const idsEmpresas = new Set(empresasFixture.map((e) => e.id));
    expect(lancamentosFixture.every((l) => idsEmpresas.has(l.empresa_id))).toBe(true);
  });
});
