export const TIPO_LABELS = {
  passagens: 'Passagens',
  hotel: 'Hotel',
  carro: 'Carro',
  passeios: 'Passeios',
  seguro: 'Seguro Viagem',
  translados: 'Translados',
  gastos_diarios: 'Gastos Diários',
  restaurantes: 'Restaurantes',
}

export const TIPO_CAMPOS = {
  passagens: [
    { key: 'cia', label: 'Cia aérea', type: 'text' },
    { key: 'voo', label: 'Nº do voo', type: 'text' },
    { key: 'data_ida', label: 'Data de ida', type: 'date' },
    { key: 'data_volta', label: 'Data de volta', type: 'date' },
    { key: 'duracao', label: 'Duração total', type: 'text' },
    { key: 'bagagem', label: 'Bagagem incluída', type: 'boolean' },
    { key: 'por_pessoa', label: 'Preço por pessoa', type: 'boolean' },
    { key: 'escala', label: 'Com escala', type: 'boolean' },
    { key: 'escala_local', label: 'Local da escala', type: 'text', showIf: { key: 'escala', value: true } },
    { key: 'escala_duracao', label: 'Duração da escala', type: 'text', showIf: { key: 'escala', value: true } },
  ],
  hotel: [
    { key: 'estrelas', label: 'Estrelas', type: 'number' },
    { key: 'cafe_manha', label: 'Café da manhã', type: 'boolean' },
    { key: 'bairro', label: 'Bairro / localização', type: 'text' },
    { key: 'regime', label: 'Regime', type: 'text' },
  ],
  carro: [
    { key: 'categoria', label: 'Categoria', type: 'text' },
    { key: 'transmissao', label: 'Câmbio', type: 'text' },
    { key: 'cobertura', label: 'Cobertura total', type: 'boolean' },
    { key: 'dias', label: 'Qtd de dias', type: 'number' },
  ],
  passeios: [
    { key: 'duracao_horas', label: 'Duração (h)', type: 'number' },
    { key: 'inclui_transporte', label: 'Transporte incluído', type: 'boolean' },
    { key: 'idioma', label: 'Idioma', type: 'text' },
  ],
  seguro: [
    { key: 'cobertura_medica', label: 'Cobertura médica (USD)', type: 'number' },
    { key: 'cobertura_bagagem', label: 'Cobre bagagem', type: 'boolean' },
    { key: 'franquia', label: 'Franquia', type: 'text' },
  ],
  translados: [
    { key: 'tipo', label: 'Tipo', type: 'text' },
    { key: 'percurso', label: 'Percurso', type: 'text' },
  ],
  restaurantes: [
    { key: 'tipo_cozinha', label: 'Tipo de cozinha', type: 'text' },
    { key: 'preco_medio_pessoa', label: 'Preço médio/pessoa', type: 'number' },
  ],
  gastos_diarios: [
    { key: 'por_dia', label: 'Por dia (por pessoa)', type: 'number' },
    { key: 'num_dias', label: 'Nº de dias', type: 'number' },
  ],
}
