"""Gera src/data/medidas-ibge.json: medidas caseiras do IBGE (POF 2008-2009) para alimentos da TACO.

O vínculo TACO -> IBGE é feito à mão (REGRAS); a preparação vem do nome da TACO.
Só entram medidas cuja descrição de referência do IBGE fala da própria medida
(ex.: "Colher de sopa" com descrição "Arroz cozido - colher de sopa cheia").
"""
import json, re, sys, unicodedata

AQUI = sys.argv[1]
TACO = sys.argv[2]
SAIDA = sys.argv[3]

def n(t):
    return unicodedata.normalize('NFD', t).encode('ascii', 'ignore').decode().lower()

ibge = json.load(open(f'{AQUI}/medidas_ibge.json'))
taco = {a['id']: a['nome'] for a in json.load(open(TACO))}

# (ids TACO, item IBGE, preparação fixa ou None para deduzir do nome TACO)
R = []
def r(ids, item, prep=None):
    R.append((ids if isinstance(ids, list) else [ids], item, prep))

# Cereais e massas (só preparados; o IBGE mede arroz e massa cozidos)
r([3, 5], 'Arroz (polido, parboilizado)', 'Não se aplica')
r(1, 'Arroz integral', 'Não se aplica')
r(7, 'Aveia em flocos')
r(8, 'Biscoito doce'); r([9, 10], 'Biscoito recheado'); r(13, 'Biscoito salgado')
r(99, 'Biscoito de polvilho')
r(16, 'Bolo de chocolate'); r(17, 'Bolo de coco'); r(18, 'Bolo de milho'); r(15, 'Bolo de aipim')
r([25, 26, 21, 22], 'Cereal matinal de milho em flocos')
r(33, 'Farinha de milho'); r(43, 'Fubá de milho'); r(42, 'Amido de milho')
r(36, 'Farinha láctea')
r(39, 'Macarrão instântaneo')
r([44, 45], 'Milho verde em conserva')
r(48, 'Pão de forma industrializado de qualquer marca')
r(52, 'Pão integral'); r(51, 'Pão de milho')
r(53, 'Pão de sal'); r(54, 'Pão não especificado')
r([56, 58], 'Pastel (queijo, carne, palmito, etc.)')
r(61, 'Pipoca doce ou salgada'); r(62, 'Polenta')
r(63, 'Torrada de qualquer pão')
r(533, 'Cuscuz'); r(534, 'Cuscuz paulista')
r(140, 'Pão de queijo')
r(551, 'Tapioca de goma')
# Verduras, legumes e tubérculos
r([64, 65, 66, 67, 68, 69], 'Abóbora'); r([70, 71, 72, 73], 'Abobrinha')
r(74, 'Acelga'); r(75, 'Agrião'); r([77, 78, 79, 80], 'Alface'); r(82, 'Alho'); r(83, 'Alho-poró')
r([86, 87], 'Cenoura amarela (Batata-baroa)')
r([88, 89], 'Batata-doce'); r([91, 92, 93, 94], 'Batata-inglesa')
r(90, 'Batata palha')
r([95, 96], 'Berinjela'); r([97, 98], 'Beterraba'); r([100, 101], 'Brócolis')
r([102, 103], 'Cará'); r(107, 'Cebola'); r([109, 110], 'Cenoura'); r([112, 113], 'Chuchu')
r([115, 116], 'Couve'); r([117, 118], 'Couve-flor'); r([119, 120], 'Espinafre')
r([121, 122], 'Farinha de mandioca'); r(131, 'Farofa'); r(126, 'Inhame'); r(127, 'Jiló')
r([129, 130, 132], 'Mandioca'); r(136, 'Nhoque'); r([138, 139], 'Palmito em conserva')
r(142, 'Pepino'); r([143, 144, 145], 'Pimentão'); r(147, 'Quiabo'); r(148, 'Rabanete')
r([149, 150, 151], 'Repolho'); r(152, 'Rúcula')
r([157, 161], 'Tomate'); r(158, 'Massa de tomate'); r(159, 'Molho de tomate'); r(162, 'Vagem')
r(125, 'Broto de feijão')
# Frutas
r(163, 'Abacate'); r(164, 'Abacaxi'); r(168, 'Açaí'); r(169, 'Acerola'); r(172, 'Ameixa')
r([175, 177, 178, 179, 180, 181, 182], 'Banana (ouro, prata, d´água, da terra, etc.)')
r(186, 'Caju'); r(189, 'Caqui'); r(190, 'Carambola'); r(194, 'Figo')
r([197, 200], 'Goiaba'); r(198, 'Goiabada'); r(204, 'Jaca'); r(207, 'Kiwi')
r([208, 210, 212, 214, 216], 'Laranja (pera, seleta, lima, da terra, etc.)')
r([209, 211, 213, 215, 217], 'Suco de laranja')
r(220, 'Limão (comum, galego, etc.)')
r([221, 222], 'Maçã'); r([225, 226], 'Mamão'); r([228, 229, 231], 'Manga'); r(232, 'Maracujá')
r(235, 'Melancia'); r(236, 'Melão'); r([237, 238], 'Mexerica'); r(251, 'Tangerina')
r(239, 'Morango'); r([242, 243], 'Pera'); r(244, 'Pêssego'); r([256, 257], 'Uva')
# Gorduras
r(260, 'Azeite de oliva'); r(259, 'Óleo de dendê')
r([261, 262], 'Manteiga com ou sem sal'); r([263, 264, 265, 266], 'Margarina com ou sem sal')
r([268, 269, 270, 272], 'Óleo de soja')
# Pescados
r([273, 274, 275, 276, 282, 283, 292, 293, 294, 301, 302, 303, 304, 305, 306, 307, 308, 315, 316, 317],
  'Peixe de mar (inteiro, em posta, em filé, etc.)')
r([289, 290, 291, 295, 311, 312, 313, 322], 'Peixe de água doce (inteiro, em posta, em filé, etc.)')
r(277, 'Atum em conserva'); r(319, 'Sardinha em conserva')
r([279, 280], 'Bacalhau'); r([284, 285, 286], 'Camarão'); r(287, 'Caranguejo')
# Carnes
r([326, 327], 'Carne moída')
r([328, 329], 'Acém'); r([347, 348], 'Costela bovina'); r([355, 356], 'Fígado bovino')
r([369, 370], 'Alcatra'); r([371, 372], 'Músculo bovino'); r([376, 377], 'Patinho')
r([380, 381, 382, 383], 'Picanha')
r([334, 335, 336, 337, 341, 342, 343, 344, 345, 346, 349, 350, 351, 352, 353, 354, 357, 358,
   359, 360, 361, 362, 363, 364, 367, 368, 373, 374, 375, 378, 379], 'Carne bovina')
r(340, 'Carne bovina', 'Empanado(a)/à milanesa')
r([338, 339, 384, 385], 'Carne de charque')
r(386, 'Coxinha'); r(389, 'Empada (queijo, carne, camarão, etc.)')
r([391], 'Asa de galinha ou frango')
r([392, 393, 402, 403, 404, 405], 'Frango inteiro')
r([396, 397, 398, 399, 411, 412, 413, 414], 'Frango em pedaços')
r([406, 407, 408, 409, 410], 'Peito de galinha ou frango')
r(401, 'Filé de frango', 'Empanado(a)/à milanesa')
r(400, 'Fígado de galinha ou frango')
r([415, 416, 417], 'Hambúrguer de carne bovina')
r([418, 419, 420], 'Linguiça de frango'); r([421, 422, 423], 'Linguiça (suína, bovina, mista, etc.)')
r(424, 'Mortadela'); r([425, 426], 'Peru em pedaço não especificado')
r([427, 428, 429], 'Bisteca suína'); r([430, 431], 'Costela suína'); r([432, 433], 'Lombo suíno')
r([435, 436], 'Pernil suíno'); r([438, 439, 323], 'Presunto'); r(443, 'Salame'); r([444, 445], 'Bacon')
r([440, 441, 442], 'Quibe')
# Leite e derivados
r(447, 'Creme de leite'); r([448, 449], 'Iogurte natural'); r([451, 452, 446], 'Iogurte de qualquer sabor')
r(453, 'Leite condensado'); r(454, 'Leite de cabra'); r(455, 'Leite achocolatado')
r(456, 'Leite em pó desnatado'); r(459, 'Leite em pó integral'); r(460, 'Leite fermentado')
r([461, 462], 'Queijo de minas'); r(463, 'Queijo muçarela'); r(464, 'Queijo ralado')
r(467, 'Queijo prato'); r(468, 'Requeijão'); r(469, 'Queijo ricota')
# Bebidas
r(471, 'Café'); r([475, 476, 477], 'Chá (preto, camomila, erva cidreira, capim limão, etc.)')
r(478, 'Água de coco'); r(479, 'Água tônica tradicional')
r(480, 'Refrigerante de cola tradicional'); r(481, 'Refrigerante de guaraná tradicional')
r(474, 'Cerveja (com ou sem álcool)')
# Ovos
r(484, 'Omelete'); r(485, 'Ovo de codorna'); r([488, 489, 490], 'Ovo de galinha')
# Açúcares e doces
r(491, 'Achocolatado em pó'); r([492, 494], 'Açúcar'); r(493, 'Açúcar mascavo')
r([495, 496, 498], 'Barra de chocolate'); r(501, 'Doce a base de leite'); r(507, 'Mel'); r(508, 'Melado')
# Outros
r(518, 'Molho de soja'); r([520, 521], 'Azeitona'); r(523, 'Leite de coco')
r(524, 'Maionese (molho)'); r(540, 'Feijoada'); r(539, 'Feijão tropeiro'); r(526, 'Arroz carreteiro')
r(532, 'Charuto de repolho pronto')
# Leguminosas e oleaginosas (só cozidas)
r([561, 563, 565, 567, 569, 571, 573], 'Feijão (preto, mulatinho, roxo, rosinha, etc.)', 'Não se aplica')
r(577, 'Lentilha'); r(560, 'Ervilha em conserva')
r(557, 'Amendoim (em grão) (in natura )'); r(558, 'Amendoim (em grão) (in natura )')
r(579, 'Paçoquinha de amendoim'); r(584, 'Tofu')
r(587, 'Amêndoa'); r(588, 'Castanha de caju'); r(589, 'Castanha-do-pará')
r(590, 'Coco'); r(594, 'Semente de linhaça'); r(597, 'Noz')

# Preparação a partir do nome TACO
PREP = [
    ('milanesa', ['empanado(a)/amilanesa']),
    ('cozid', ['cozido(a)']), ('assad', ['assado(a)']),
    ('grelhad', ['grelhado(a)/brasa/churrasco']),
    ('frit', ['frito(a)']), ('refogad', ['refogado(a)']), ('sauté', ['refogado(a)', 'frito(a)']),
    ('crua', ['cru(a)']), ('cru,', ['cru(a)']),
]
def chave_prep(p):
    return n(p).replace(' ', '').replace('-', '')

def preps_de(nome):
    s = n(nome) + ','
    for k, v in PREP:
        if n(k) in s:
            return v
    return []

# Palavras-chave que a descrição do IBGE precisa conter para a medida valer
ALIAS = {
    'colher de arroz/servir': ['colher de arroz', 'colher de servir'],
    'xicara de cha': ['xicara'],
    'unidade pequena': ['unidade pequena'],
    'copo de requeijao': ['copo de requeijao'],
    'file': ['file'],
}
FORA = {'grama', 'quilo', 'mililitro', 'litro', 'dose', 'taca', 'espetinho', 'espeto'}
# O IBGE chama de "unidade" a fatia de pão de forma
ACEITAR = {('Pão de forma industrializado de qualquer marca', 'Fatia'), ('Pão integral', 'Fatia'), ('Tofu', 'Fatia')}
# Copos e xícaras de referência genérica (só volume) valem só para líquidos
LIQUIDOS = {209, 211, 213, 215, 217, 446, 448, 449, 451, 452, 454, 455, 460, 471, 474, 475, 476, 477,
            478, 479, 480, 481, 523}

def vale(o, taco_id):
    m = n(o['medida'])
    if m in FORA or m.startswith('garrafa') or m.startswith('lata'):
        return False
    if (o['alimento'], o['medida']) in ACEITAR:
        return True
    d = n(o['desc'])
    if not any(k in d for k in ALIAS.get(m, [m])):
        return False
    generica = ' - ' not in o['desc']
    return not generica or taco_id in LIQUIDOS

por_item = {}
for o in ibge:
    por_item.setdefault(o['alimento'], []).append(o)

saida, faltam = {}, []
for ids, item, prep in R:
    if item not in por_item:
        faltam.append(item)
        continue
    linhas = por_item[item]
    preps_item = {chave_prep(o['prep']) for o in linhas}
    for i in ids:
        if i not in taco:
            faltam.append(f'taco {i}')
            continue
        quer = [chave_prep(prep)] if prep else preps_de(taco[i])
        escolha = next((p for p in quer if p in preps_item), None)
        if escolha is None:
            escolha = 'naoseaplica' if 'naoseaplica' in preps_item else None
        if escolha is None:  # preparação mais citada do item
            from collections import Counter
            escolha = Counter(chave_prep(o['prep']) for o in linhas).most_common(1)[0][0]
        vistas = {}
        for o in linhas:
            if chave_prep(o['prep']) != escolha or not vale(o, i):
                continue
            vistas.setdefault(o['medida'], (o['gramas'], o['desc'].strip()))
        if vistas:
            saida[str(i)] = [{'nome': k, 'gramas': g, 'desc': d} for k, (g, d) in sorted(vistas.items(), key=lambda x: x[1][0])]

json.dump(saida, open(SAIDA, 'w'), ensure_ascii=False, separators=(',', ':'))
print('alimentos com medida:', len(saida), 'medidas:', sum(len(v) for v in saida.values()))
print('faltam:', faltam)
