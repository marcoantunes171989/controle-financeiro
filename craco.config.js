const path = require('path');
const webpack = require('webpack');

// Flag exclusiva do ambiente visual sintético (Microgate 09-C). Quando
// ausente (padrão), o comportamento normal é preservado integralmente.
const VISUAL_MOCK_ATIVO = process.env.REACT_APP_VISUAL_MOCK === '1';

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
    configure(webpackConfig) {
      if (VISUAL_MOCK_ATIVO) {
        // Substitui todo import do cliente Supabase real pelo cliente
        // sintético, no nível do webpack, usando NormalModuleReplacementPlugin
        // em vez de resolve.alias: o alias depende da string de import
        // literal e falharia para profundidades relativas diferentes
        // ('../integrations/supabase/client' vs './integrations/supabase/client'),
        // enquanto este plugin casa o caminho final do módulo e substitui por
        // um caminho absoluto, sem depender da forma relativa do import.
        webpackConfig.plugins.push(
          new webpack.NormalModuleReplacementPlugin(/integrations\/supabase\/client$/, (resource) => {
            resource.request = path.resolve(__dirname, 'src/integrations/supabase/client.visual-mock.ts');
          }),
        );
      }
      return webpackConfig;
    },
  },
  jest: {
    configure: {
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },
  },
};
