// Testes exclusivos do Microgate 09-C: validam que o alias condicional do
// cliente visual em craco.config.js só é ativado com a flag de ambiente, e
// que a configuração normal (alias "@" e moduleNameMapper do Jest) nunca é
// substituída ou perdida.
export {};

const CAMINHO_CONFIG = require.resolve('../craco.config.js');

type WebpackConfigFalso = { plugins: unknown[] };

function carregarConfig(): {
  webpack: { alias: Record<string, string>; configure: (c: WebpackConfigFalso) => WebpackConfigFalso };
  jest: { configure: { moduleNameMapper: Record<string, string> } };
} {
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(CAMINHO_CONFIG);
}

describe('craco.config.js — flag REACT_APP_VISUAL_MOCK (Microgate 09-C)', () => {
  const flagOriginal = process.env.REACT_APP_VISUAL_MOCK;

  afterEach(() => {
    if (flagOriginal === undefined) {
      delete process.env.REACT_APP_VISUAL_MOCK;
    } else {
      process.env.REACT_APP_VISUAL_MOCK = flagOriginal;
    }
    jest.resetModules();
  });

  test('01. sem a flag: nenhum plugin de substituição visual é adicionado', () => {
    delete process.env.REACT_APP_VISUAL_MOCK;
    const config = carregarConfig();
    const resultado = config.webpack.configure({ plugins: [] });
    expect(resultado.plugins).toHaveLength(0);
  });

  test('02. com a flag "1": o plugin de substituição visual é adicionado', () => {
    process.env.REACT_APP_VISUAL_MOCK = '1';
    const config = carregarConfig();
    const resultado = config.webpack.configure({ plugins: [] });
    expect(resultado.plugins).toHaveLength(1);
  });

  test('com qualquer outro valor da flag (ex.: "0" ou "true"): comportamento normal é preservado', () => {
    process.env.REACT_APP_VISUAL_MOCK = '0';
    let config = carregarConfig();
    expect(config.webpack.configure({ plugins: [] }).plugins).toHaveLength(0);

    process.env.REACT_APP_VISUAL_MOCK = 'true';
    config = carregarConfig();
    expect(config.webpack.configure({ plugins: [] }).plugins).toHaveLength(0);
  });

  test('19. configuração normal (alias "@" e moduleNameMapper do Jest) nunca é substituída', () => {
    delete process.env.REACT_APP_VISUAL_MOCK;
    const semFlag = carregarConfig();

    process.env.REACT_APP_VISUAL_MOCK = '1';
    const comFlag = carregarConfig();

    expect(semFlag.webpack.alias['@']).toMatch(/[\\/]src$/);
    expect(comFlag.webpack.alias['@']).toBe(semFlag.webpack.alias['@']);
    expect(comFlag.jest.configure.moduleNameMapper['^@/(.*)$']).toBe(
      semFlag.jest.configure.moduleNameMapper['^@/(.*)$'],
    );
  });

  test('configure() preserva plugins pré-existentes do webpack ao adicionar o novo', () => {
    process.env.REACT_APP_VISUAL_MOCK = '1';
    const config = carregarConfig();
    const pluginExistente = { nome: 'plugin-pre-existente' };
    const resultado = config.webpack.configure({ plugins: [pluginExistente] });
    expect(resultado.plugins).toHaveLength(2);
    expect(resultado.plugins).toContain(pluginExistente);
  });
});
