"""Lê o texto do PDF da Tabela de Medidas Referidas (IBGE, POF 2008-2009) e grava medidas_ibge.json na pasta atual."""
import re, json, sys
F=sys.argv[1]
lines=open(F,encoding='utf-8').read().split('\n')
txt='\n'.join(lines[1197:]).replace('\x02','').replace('especi- ficada','especificada')
# remove page boilerplate
junk=[r'_{5,}', r'Tabela de Medidas Referidas para os Alimentos Consumidos no Brasil', r'\((continua|continuação|conclusão)\)', r'Quan-\s*tidade \(g\)', r'Quantidade\s*\n\(g\)', r'Fonte e descrição\s*\ndo alimento na referência', r'Código e descrição\s*\ndo alimento', r'Código e descrição\s*\nda preparação', r'Código e descrição\s*\ndo tipo de medida padrão', r'Código e descrição\s*\ndo tipo de medida', r'Descrição da Tabela de Medidas Referidas dos Alimentos Consumidos no Brasil', r'Pesquisa de Orçamentos Familiares 2008-2009']
for j in junk: txt=re.sub(j,' ',txt)
txt=re.sub(r'\s+',' ',txt)
txt=re.sub(r'(?<=[^\d\s])(\d{7}) ',r' \1 ',txt)
preps=['Cru(a)','Cozido(a)','Grelhado(a)/Brasa/Churrasco','Assado(a)','Frito(a)','Empanado(a)/ àmilanesa','Refogado(a)','Molho vermelho','Molho branco','Ao alho e óleo','Com manteiga/Óleo','Ao vinagrete','Ensopado','Mingau','Sopa','Não se aplica']
q2=open(F,encoding='utf-8').read().split('Código Medidas Código Medidas')[1].split('Fonte:')[0]
meas={}
for m in re.finditer(r'(\d{1,3}) ([^\d\n][^\n]*?)(?= \d{1,3} |\n|$)', q2): meas[int(m.group(1))]=m.group(2).strip()
assert len(meas)==106, len(meas)
P='|'.join(re.escape(p) for p in sorted(preps,key=len,reverse=True))
M='|'.join(re.escape(v) for v in sorted(meas.values(),key=len,reverse=True))
row=re.compile(r'(\d{7}) (.+?) (\d{1,2}) ([^\d]+?) (\d{1,3}) ('+M+r') (\d{1,3}) ('+M+r') ([\d.]*\d(?:,\d+)?) (\d{1,2}) (.*?)(?= \d{7} |$)', re.I)
out=[]
for m in row.finditer(txt):
    out.append(dict(cod=m.group(1),alimento=m.group(2),prep=m.group(4),medida=next(v for v in meas.values() if v.lower()==m.group(6).lower()),padrao=m.group(8),gramas=float(m.group(9).replace('.','').replace(',','.')),fonte=int(m.group(10)),desc=m.group(11).strip()))
codes=re.findall(r'(?<!\d)(\d{7})(?= )',txt)
print('rows',len(out),'code occurrences',len(codes), 'itens', len({o['cod'] for o in out}))
json.dump(out,open('medidas_ibge.json','w',encoding='utf-8'),ensure_ascii=False)
import collections
print(collections.Counter(o['fonte'] for o in out).most_common(16))
print(len(out), 'medidas lidas')
