// Usuário e sessão fictícios — exclusivos do ambiente visual sintético.
// Nenhum valor aqui corresponde a uma conta real; o id e o e-mail são
// descartáveis e existem apenas em memória durante a sessão do navegador.

export const USUARIO_FICTICIO_ID = '00000000-0000-4000-8000-000000000001';

export const fixtureUser = {
  id: USUARIO_FICTICIO_ID,
  aud: 'authenticated',
  role: 'authenticated',
  email: 'usuario.visual@exemplo.local',
  app_metadata: {},
  user_metadata: { nome: 'Usuário Visual Sintético' },
  created_at: '2026-01-01T00:00:00.000Z',
};

export const fixtureSession = {
  access_token: 'visual-mock-access-token',
  refresh_token: 'visual-mock-refresh-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: fixtureUser,
};
