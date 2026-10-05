# Corrección de restauración de bases en la vía A — 5 de octubre de 2026

[English](lane_a_python_compatibility_EN.md) · [Intento fallido original](catalogue_campaign_source_895a3bd_ES.md)

El usuario solicitó una corrección local después de que los dos jobs del run
`37342413975` se detuvieran en las pruebas compartidas. La restauración de bases
usaba `TarFile.extractall(filter='data')`, no disponible en el Python Debian
`3.11.2-6+deb12u8` de esos jobs. Este registro corresponde al arreglo posterior
del árbol de trabajo, sin otra ejecución del catálogo ni de la campaña temporal.

## Cambio y fuente

[restore_database](../scripts/paired-rg.py) valida ahora el inventario completo
antes de crear el destino y copia únicamente `db/trivy.db`, `db/metadata.json`,
`identity.json` y `SHA256SUMS.txt` mediante `extractfile()`. Los cuatro miembros
deben ser archivos regulares; se rechazan duplicados, ausencias, miembros extra
y rutas inseguras. El destino debe ser nuevo, sin padres simbólicos; sus
directorios son privados y sus archivos se crean de forma exclusiva. No se
aplican permisos, propietarios ni metadatos de enlaces del paquete. Se conservan
como obligatorios los hashes exterior e internos, identidad PASS, los dos hashes
de la base y la igualdad de metadatos.

El cambio es local, sin commit, en `test/catalogue-campaign-source`, sobre
`c2b403cd436449b1b2818f5fe92983ecf946d072`. SHA-256 de los archivos ensayados:

| Archivo | SHA-256 |
|---|---|
| `scripts/paired-rg.py` | `0aece17d67a31927fc3b66e49442a9f330cd11e7bc1048660a4ec3325e2fdc2e` |
| `tests/unit/test_paired_measurements.py` | `5050965104f7e92548f52735b8243d1f1fdd174a9b002e72a37d30a60dbe298f` |

No cambiaron controles, versiones de dependencias/herramientas, fixtures de
escáner ni oráculos. Una futura ejecución del código corregido debe registrar
su propio commit; no podrá atribuirse a `895a3bd`.

## Comprobaciones realizadas

La regresión enfocada de restauración falló antes del cambio y pasa después.
Prohíbe las dos API de extracción a disco, de modo que un Python más reciente
no oculte la dependencia de sus filtros. Los fixtures sintéticos también cubren
corrupción, inventarios inválidos, miembros enlace/dispositivo/directorio,
destinos o padres simbólicos y conservación de un destino existente.

Se recuperaron los mismos cuatro paquetes Debian de Python de los jobs fallidos
desde el snapshot `20260921T000000Z` del repositorio, verificando tamaños y SHA-256
contra el índice de paquetes, y se extrajeron bajo `/tmp`. El intérprete declara
Python 3.11.2 y ausencia del parámetro `filter`. Son los mismos paquetes Python,
**no una reproducción del devcontainer completo**: las bibliotecas compartidas
y otras herramientas proceden de Codespaces. Las comprobaciones finales ponen
también este intérprete al principio del `PATH` de los subprocesos. El lanzador
inicial exportaba `PYTHONHOME`, lo que rompía una prueba que invoca expresamente
el `/usr/bin/python3` del host; ahora Python encuentra su biblioteca adyacente
sin esa variable. Se conservan este fallo de preparación local y el diagnóstico
anterior con mezcla de intérpretes, sin adaptar pruebas de políticas ni código
de producción al lanzador.

- PASS: 55 regresiones de mediciones y 37 de campaña con ese Python.
- PASS: cinco pruebas enfocadas de restauración con Python 3.14.2 del host.
- PASS: `make -C implementacion doctor` con el lanzador Python 3.11.2.
- PASS: `make -C implementacion test` con el lanzador Python 3.11.2 corregido:
  seis checks de entorno, 930 casos de servicio/unidad, 43 de políticas Python,
  Conftest/Kyverno, criptografía local real con Cosign sobre entradas sintéticas
  y ejecutor estático de workflows. Este último prueba entradas inertes F01/F02
  sobre el árbol actual; no son observaciones del run fallido de `895a3bd`.
- PASS: 252 enlaces locales, diez bloques Bash, sintaxis de publicación sin
  ejecutarla, hashes de fuentes/evidencias y cuatro matrices de veinte filas.
  Se recomprobaron los 97 archivos de revisión conservados y el paquete original;
  las declaraciones humanas del 4 de octubre siguen intactas.

Logs, identidades de paquetes, hashes de fuentes y revisión final se mantienen
separados de los originales fallidos en el directorio ignorado
`evidence/environment/lane-a-python-compatibility-20261005/`. Los controles de
espacio e inodos conservaron la reserva de 3 GiB/20.000 inodos. No se usó limpieza
global de Docker.

## Límites y revisión

No se lanzó ni reintentó ningún workflow; no hubo commit, push, PR remota, merge,
release ni cambio de configuración. El run `37342413975` sigue FAIL en ambas
suites, con **0/20 ejecutados, todos NOT_EXECUTED**, sin paquetes de escenarios ni
bases de vulnerabilidades. Sus originales, paquete de conservación e índice de
hashes siguen intactos. Los checks compartidos no acreditan integración real de
los escenarios sobre la fuente corregida.

Continúa abierta la limitación de catálogo completo sobre la fuente de campaña.
Los diez pares, registros funcionales anteriores y aceptación de alcance reducido
del 4 de octubre conservan sus fuentes y significado. Quedan pendientes evaluación
humana/económica, negativos B no soportados, revisión humana del arreglo y
aceptación de nueva evidencia. No se editó la memoria.

| Actividad | Asistencia | Revisión humana | Decisión |
|---|---|---|---|
| Reproducir la incompatibilidad, corregir restauración y regresiones, verificar localmente y actualizar entrega EN/ES | OpenAI Codex / GPT-6 | Pendiente | Regresiones locales PASS; integración real completa sobre un commit corregido pendiente |
