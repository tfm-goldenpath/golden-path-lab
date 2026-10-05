# Evaluación económica: consumo observado de recursos

[English](../EN/economic-evaluation.md) · [Índice de identidades y cálculo](../../registros/economic-evaluation-20261005.json) · [Estado de evaluación](evaluation-readiness.md)

**5 de octubre de 2026.** Esta evaluación añade una interpretación económica
limitada a los recursos de los experimentos conservados. Por indicación del usuario,
**no incluye importes, tarifas ni costes supuestos**. Utiliza duración de jobs,
mediciones pareadas existentes y tamaños de artefactos. Acredita el consumo dentro
de esas fronteras, sin determinar rentabilidad, productividad ni gasto total del
proyecto. La revisión humana de este suplemento sigue pendiente.

[Descargar suplemento de cálculo](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/economic-evaluation-resources-20261005.zip)
y su [archivo SHA-256](https://github.com/tfm-goldenpath/golden-path-lab/releases/download/evidence-campaign-895a3bd-20261004/economic-evaluation-resources-20261005.zip.sha256).
Contiene las entradas pequeñas originales, cálculos, CSV e informe EN/ES; los
paquetes grandes de [campaña](paired-rg-campaign-results.md) y [catálogo](../../registros/lane_a_corrected_91a33e9_ES.md)
permanecen en sus publicaciones existentes.

## Fronteras y método

Campaña, preparación y los dos intentos del catálogo conservan fuentes y resultados
separados. La campaña usa `895a3bde79089b7544c1dad76a6cd8f48eede0a8`; el catálogo
satisfactorio usa `91a33e910ee2ba9ded5391393b06ca70005de4d4`. Su fuente y bases
distintas no se convierten en nuevas muestras temporales R/G. La base documental
de este análisis es `ba56ca91552ac2d508882b191410a578f05d632c`.

Para cada job con runner asignado, los segundos observados son
`completed_at − started_at` según los metadatos Actions conservados. Su suma,
dividida entre 60, da minutos de jobs. Se incluyen jobs fallidos; los omitidos sin
runner se identifican aparte. Duración de job no equivale a tiempo de CPU ni a
esfuerzo humano activo. Con jobs paralelos, la ventana transcurrida va del primer
inicio al último fin: excluye la cola inicial y difiere de la suma de duraciones.

El analizador original de campaña aporta los intervalos R/G y diferencias pareadas.
No se ejecutaron nuevas cargas, pares temporales ni tareas manuales. Se reutilizan
las revisiones originales de escenarios, criptografía y bases dentro de su alcance;
las comprobaciones nuevas son de integridad, identidad y aritmética.

## Recursos de ejecución observados

| Dataset / actividad | Fuente | Runs / jobs con runner | Suma de segundos de jobs | Suma de minutos de jobs |
|---|---|---:|---:|---:|
| Diez pares de campaña | `895a3bd` | 10 / 10 | 3.343 | 55,717 |
| Desarrollo RG y GR | `895a3bd` | 2 / 2 | 698 | 11,633 |
| Publicación del plan | `895a3bd` | 1 / 1 | 24 | 0,400 |
| Catálogo fallido, `37342413975` | `895a3bd` | 1 / 2 | 321 | 5,350 |
| Catálogo corregido, `37353632299` | `91a33e9` | 1 / 2 | 1.294 | 21,567 |

Son inventarios separados, no una muestra experimental conjunta ni el total de
recursos del proyecto. Se excluyen piloto anterior, reparaciones guionizadas,
otros runs de desarrollo/CI, Codespaces, revisión y esfuerzo humano. El índice y
CSV identifican cada run y job incluido, y los trece jobs omitidos por separado.

En el catálogo satisfactorio, demo dura **834 s** y vulnerabilities **460 s**.
Se solapan: la ventana es **835 s (13,917 min)** y la asignación sumada es
**1.294 s (21,567 min)**. El catálogo fallido consumió **321 s** de asignación aunque
no ejecutó ningún escenario; su ventana fue de **164 s**. Ese consumo fallido
permanece en el registro.

## Incremento asociado a los controles Golden Path

Las diez observaciones pareadas originales dan una mediana de incremento G−R de
**55,090 s**, media **54,939 s** y rango **44,120–67,265 s** en el intervalo primario.
La mediana relativa es **831,650 %**, limitada a este servicio sintético y al breve
intervalo R. Estos descriptivos no garantizan precisión ni pronostican producción.

Los intervalos primarios R suman **64,621 s** y los G **614,011 s**. Sus
**678,632 s** conjuntos ocupan solo una parte de los **3.343 s** de jobs completos.
Los **2.664,368 s** restantes quedan fuera de los intervalos primarios, que excluyen
preparación compartida, readiness, rollout/HTTP, limpieza y empaquetado. El intervalo
G incluye procedencia nativa y esperas entre pasos; no mide únicamente CPU de los
controles. No se reparte el trabajo compartido entre R y G. La diferencia pareada
es, por tanto, incremento de tiempo de entrega, no comparación completa de recursos
por brazo.

La contrapartida técnica es la protección y evidencia demostradas separadamente:
el catálogo corregido de vía A pasa veinte escenarios, con rechazos atribuibles y
recuperaciones legítimas. No cuantifica frecuencia de incidentes, pérdidas evitadas
ni ahorro de tiempo humano. L01/L03/L04 compartidos y las recuperaciones siguen
siendo observaciones vinculadas, no beneficios independientes.

## Recursos de conservación

Los tamaños son los ZIP originales registrados por Actions, no un contador de
almacenamiento de la cuenta ni un historial de bytes-hora ocupados. Un MiB equivale
a 2²⁰ bytes.

| Dataset con metadatos de artefactos | Artefactos originales | Bytes | MiB |
|---|---:|---:|---:|
| Campaña | 10 | 1.169.988.488 | 1.115,788 |
| Desarrollo RG/GR | 2 | 234.028.888 | 223,187 |
| Catálogo fallido | 4 | 77.486 | 0,074 |
| Catálogo corregido | 4 | 246.160.930 | 234,757 |

El tamaño del artefacto del plan queda fuera de este inventario acotado; su ausencia
no representa cero bytes. En el catálogo corregido, los dos ZIP de bases separados
ocupan **241.344.951 bytes**, el **98,044 %** de sus artefactos. Los inventarios de
ambos tar de bases expanden **2.972.215.852 bytes (2,768 GiB)**. Los metadatos de suite
conservan instantes de descarga distintos, aunque los bytes de base coincidan entre
ellas; ambas difieren de la base de campaña. Se mantienen las dos identidades.

La retención registrada es de 30 días para artefactos de campaña/desarrollo y
14 días para los del catálogo. Los suplementos de descarga permanente incluyen
además revisiones, logs y documentación; su tamaño es otra medida. Copias de trabajo
expandidas, imágenes, cachés y demás almacenamiento quedan fuera del inventario.
El predominio de las bases identifica la principal necesidad de conservación
observada, sin autorizar borrados ni cambios de retención.

## Integridad, interpretación y trabajo restante

El cálculo usa **46 archivos pequeños conservados**. El hash del análisis de campaña
coincide con su índice publicado; los diez archivos de jobs coinciden con los hashes
que registró el analizador, y los metadatos del catálogo con sus manifiestos previos.
Se comprueban fuente, run, intento, etiqueta del runner y resultado. El cálculo
Python coincide con una comprobación independiente en Node: **17 jobs con runner**,
trece omitidos y todos los totales, incluidos los segundos fallidos. Se reproducen
los **55.71666666666667** minutos de campaña del analizador original. No se modifican
los experimentos ni la declaración humana del 4 de octubre.

La limitación pasa de «sin análisis económico» a **evaluación de recursos documentada
sin valoración monetaria**. Se puede informar del incremento de entrega y demanda
de conservación observados. No queda acreditada rentabilidad financiera, gasto total,
mejora de productividad humana ni consumo necesario en producción. Esas conclusiones
exigirían mediciones y contexto adicionales; la instrucción actual excluye añadir
costes. La evaluación humana y los negativos alojados no soportados siguen pendientes.
No se ha editado la memoria.

Para reproducir la aritmética tras verificar el hash de descarga y extraer el
suplemento en un directorio nuevo, ejecutar desde su raíz:

```bash
sha256sum -c SHA256SUMS.txt
python3 derived/analyze_resources.py --input-root originals --output-dir recalculated
```

El directorio de salida no debe existir, para conservar los resultados anteriores.
El suplemento no contiene credenciales ni datos de facturación.

| Actividad | Asistencia | Revisión humana | Decisión |
|---|---|---|---|
| Derivar inventario de recursos, comprobar aritmética, redactar interpretación EN/ES y conservar suplemento | OpenAI Codex / GPT-6 | Pendiente | Cálculo técnico PASS; valoración monetaria excluida por indicación del usuario |
