# Experimento de inventario independiente de imagen

[Registro principal EN](../../EN/maintainers/sbom-image-consistency.md).

## Pregunta y alcance

¿Permite un inventario independiente del filesystem detectar discrepancias
concretas en el SBOM CycloneDX actual de Trivy? El experimento opcional compara
identidad binaria, versión completa y arquitectura dpkg en **linux/amd64**.
No ejecuta la aplicación ni cambia entrega, siete checks, atestaciones, políticas,
escaneo de vulnerabilidades o admisión.

Base confirmada: PR #80 mergeada el 16 de noviembre de 2026 en
`03203f4a1b99ed15b7ca1811ee6915e0e3923494`. Se utiliza un worktree limpio en
`/workspaces/sbom-image-consistency`; se conserva el cambio previo del lock en el
checkout original. Contrato anterior al escaneo: `4c5516c`. Adquisición ejecutada
con motor `391b77aa4313040a60a8b900fcd45160b68f0766`; los recibos registran también
el hash del runner. Consumidor Node independiente comprometido en
`193373a0164325a9d8a052f1fb8b9643b9a43292`, con base Debian fijada en lugar del
Alpine del starter. Las identidades completas están en la tabla EN y los recibos.

## Independencia y contrato

Fuentes oficiales consultadas el 16 de noviembre de 2026: release, verificación,
formatos de entrada, catalogadores, licencia y parser dpkg, enlazados en EN.
Syft **1.57.1**, Apache-2.0, se instala solo para el experimento. Cosign verifica
el bundle de los checksums con identidad exacta del workflow e issuer GitHub;
el archivo se contrasta con ese checksum firmado. SHA-256 del archivo Syft:
`bf52519eb57f675d47c07d43213cb6dff6449f3d6d1147ff6701ed91f44eef0c`.
Trivy permanece en **0.76.1**. No se modifica ningún pin de producción.

Ambos scanners leen los mismos bytes del archivo Docker, con hashes antes/después.
Syft usa `docker-archive:`, vista final `squashed` y únicamente
`dpkg-db-cataloger`; no descubre SBOM adjuntos ni consume el informe Trivy.
Se comprueban plataforma y configuración. El digest de manifiesto Docker
reconstruido por Syft no se confunde con el manifiesto OCI ni el hash del tar.
La lectura propia del tar solo inspecciona metadatos externos acotados: no extrae
capas ni interpreta whiteouts. Se conservan originales y normalizados separados.

La clave incluye familia, distribución/versión, nombre binario y arquitectura.
La versión conserva epoch y revisión. `all` y `amd64` son distintos. El paquete
fuente no sustituye al binario. Se conservan PURL, qualifiers, ubicaciones y
punteros originales. Duplicados, campos ambiguos, inventario vacío, formatos
inválidos, hashes cambiados o fallos de colección son ERROR. Las familias ajenas
son NOT_EVALUATED. CycloneDX usa el validador oficial 1.7 existente; Syft tiene
un contrato estricto de campos soportados, no una validación completa de su esquema.

Se observó una diferencia de modelado: Trivy representa 66 epochs como qualifier
PURL; Syft los incluye en la versión. La regla revisada reconstruye la versión
sin perder información y rechaza epochs ambiguos. Se conserva la evaluación
inicial ERROR. No se recortan sufijos ni se eliminan qualifiers para lograr MATCH.
El parser Syft descarta entradas `deinstall`, pero no expone Status en el inventario;
otros estados dpkg requieren una política futura explícita.

Una inspección estática acotada con el catalogador de contenido de Syft confirma
que las 413 filas Node tienen `install ok installed` en `/var/lib/dpkg/status`,
con nombre/versión/arquitectura exactos. Se conservan informe y hashes; no se
ejecutaron comandos de la imagen ni se extrajeron capas manualmente.

## Resultados reales

| Caso | Esperado | Observado |
| --- | --- | --- |
| A: misma imagen Node | Observar sin presuponer MATCH | MATCH, 413 paquetes dpkg |
| B: copia sin adduser | MISMATCH | MISMATCH, un ONLY_SYFT |
| C: copia cambia adduser 3.134 a 3.134-spike | MISMATCH | MISMATCH, un VERSION |
| D: Node frente a inventario real de base Temurin | ERROR | ERROR de asociación |
| E: JSON inválido | ERROR | ERROR de formato |
| F: ejecutable Syft inexistente sobre archivo Node válido | ERROR | ERROR, salida 127 |
| Observación separada de base Java | Observar | MATCH, 108 paquetes dpkg |

B/C son fixtures negativos identificados, no emisiones auténticas. Sus originales
permanecen intactos. Detectar el negativo no significa aprobarlo. La observación
Java es de la **base JRE**, no del consumidor completo (NOT_EXECUTED). Trivy
identifica Ubuntu y 108 paquetes, sin componente JRE separado en esta ejecución.
Syft está limitado a dpkg, por lo que esto no evalúa su identificación general de
Java. Se adquirió una DB Java nueva; se conservan bytes y metadatos por separado.
No se escanearon ni interpretaron CVE.

Se conservan los intentos fallidos: comprobación inicial de lectura, entrada OCI
no soportada por Trivy, límite temporal de archivo insuficiente para el binario
Node, DB Java ausente y primera interpretación del epoch. Node final: unos
10,69 s Trivy + 12,07 s Syft; base Java: 3,52 s + 3,82 s. No son un benchmark.

## Reproducción y recursos

Los siguientes comandos son los mismos de EN y parten de la raíz del motor.
Los destinos nuevos deben estar ausentes. El bundle Git conserva el consumidor;
los archivos de imagen permiten repetir el análisis exacto sin reconstruir.
Una reconstrucción puede cambiar metadatos y requiere identidades nuevas.

```bash
# Prepare a fresh independent Node experiment (downloads verified Syft and image).
bash implementation/tests/integration/sbom-image-prepare.sh implementation/evidence/raw/sbom-image-consistency-new
# Reanalyze preserved reports without scanners, Docker or credentials.
node implementation/tests/integration/sbom-image-compare.mjs implementation/evidence/raw/sbom-image-consistency-20261116/node-final
# Fresh scan of the retained Docker archive; destination must not exist.
python3 implementation/tests/integration/sbom-image-run.py implementation/evidence/raw/sbom-image-consistency-20261116/image-docker.tar implementation/evidence/raw/sbom-image-consistency-20261116/replay implementation/.tools/sbom-spike/syft
# Directed fixture matrix; destination must not exist.
node implementation/tests/integration/sbom-image-matrix.mjs implementation/evidence/raw/sbom-image-consistency-20261116/node-final implementation/evidence/raw/sbom-image-consistency-20261116/java-final implementation/evidence/raw/sbom-image-consistency-20261116/replay-matrix
# Controlled scanner-execution failure: expected ERROR / exit 2.
python3 implementation/tests/integration/sbom-image-run.py implementation/evidence/raw/sbom-image-consistency-20261116/image-docker.tar implementation/evidence/raw/sbom-image-consistency-20261116/replay-error /nonexistent-sbom-spike-scanner
# Package compact selected evidence; images and DB remain separate retained inputs.
python3 implementation/tests/integration/sbom-image-evidence.py package implementation/evidence/raw/sbom-image-consistency-20261116 implementation/evidence/packages
python3 implementation/tests/integration/sbom-image-evidence.py verify implementation/evidence/packages/sbom-image-consistency-20261116.tar.gz
node --test implementation/tests/unit/sbom-image.test.mjs
python3 -I -S implementation/tests/unit/test_sbom_image_runner.py
```

La preparación usa `bin/deliver init`, commit del consumidor con base Debian,
captura existente y Buildx con salida Docker local. El argv exacto se conserva
en `build-docker-request.txt`. El manifiesto experimental fija URL, checksum e
identidad de Syft; descargar, verificar con el procedimiento oficial e instalar
solo el binario regular acotado. No usar instalador por pipe.

El perfil efectivo es `.devcontainer/implementation/devcontainer.json`, no la
imagen universal. Node 24.22.1, npm/npx 12.2.2 y Codex 0.167.0 coinciden en sesiones
actuales/nuevas. Doctor pasa. Docker y workspace comparten 32 GB; `/tmp` es otro
filesystem y no se suma a ese presupuesto. Reserva de 3 GiB más crecimiento;
scanners limitados a dos CPU, dos workers y 900 s. Informes/logs aceptados hasta
32 MiB; la comprobación periódica puede exceder brevemente ese límite antes de
rechazar, con límite duro de archivo de 2 GiB para temporales del scanner.

No se crearon contenedores, builders con nombre, tags ni volúmenes. Se conserva
la caché del builder predeterminado porque no se puede demostrar propiedad
exclusiva. No hay prune general ni eliminación ajena. Se retienen imágenes,
bundle del consumidor y DB Java; el paquete compacto excluye capas, cachés y
material privado. Los hashes prueban identidad de bytes, no firma ni autorización.

## Conclusión

**GO para diseñar un futuro control opcional de consistencia dpkg**, limitado al
alcance Node/Debian/linux-amd64 probado. La adquisición independiente y los
negativos concretos funcionan. Todavía no se promueve a gate: quedan estados
dpkg generales, variaciones de modelado, semántica de fuentes, adquisición
autenticada y decisiones de política. La observación de base JRE no establece
soporte Java general.

No se afirma completitud del SBOM, ausencia de malware/vulnerabilidades, integridad
de todos los archivos, cumplimiento regulatorio ni admisión. OpenAI Codex realizó
implementación y ejecución; revisión humana, aceptación, custodia y licencia
siguen pendientes. Promoción opcional e integración autenticada requieren ramas
y requisitos separados.

## Validación y preservación

Pasan 31 regresiones sintéticas del comparador/lector, ocho pruebas del runner
(incluidos miembros tar inseguros) y 11 pruebas de inventario. Inventario de 879
rutas, workflows, doctor, enlaces relativos y comandos EN/ES pasan. La suite
compartida pasó en el árbol de desarrollo; los logs local/CI del commit final y
la verificación de artefactos se registran en la entrega de la PR, sin reasignar
revisiones a ejecuciones anteriores.

El comando completo de preparación se ejecutó por separado en `8de437e` y volvió
a obtener MATCH para 413 paquetes. Sus identidades son propias. Cinco salidas de
la matriz se reproducen con bytes idénticos.

Paquete local `sbom-image-consistency-20261116.tar.gz`: **148 hashes internos
verificados**, SHA-256
`3a2d9ddb57e0942448f13ea452ee729bc27ceb4383e8d4e35b76322b637429f2`.
Se retiró el duplicado OCI inicial tras registrar hash y equivalencia de
configuración/manifiesto con el Docker conservado. Quedan unos 21 GiB en
workspace/Docker; el resumen conserva bytes exactos. CI preserva logs y SHA de
la suite incluso en fallo, con la acción fijada y permisos existentes; no descarga
Syft ni ejecuta esta matriz. Los recibos CI posteriores se conservan aparte del
paquete local sellado. No se midió RSS máximo; memoria disponible, disco y tiempos
observados no constituyen garantías de rendimiento.
