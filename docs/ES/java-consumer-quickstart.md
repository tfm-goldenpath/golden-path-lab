# Prueba acotada de consumidor Java

[Guía](README.md) · [English](../EN/java-consumer-quickstart.md) · [Validación y límites](../EN/maintainers/java-consumer-validation.md)

`java-http-consumer/v1` entrega un servicio JDK HttpServer sin bibliotecas de
producción, con Temurin 25.0.5+8 y Maven 3.10.0. El motor fijado mantiene controles,
evidencia e infraestructura. El consumidor mantiene código Java, pruebas y
recursos; POM, Dockerfile y `.dockerignore` son fijos. Sin `--profile` se conserva
Node. Perfiles desconocidos, pins móviles y configuración ampliada se rechazan.
La aceptación mediante entregas reales sigue pendiente según el recibo mantenedor.
No constituye soporte general Java/frameworks.

## Requisitos y creación

Utilice las herramientas Linux AMD64 del motor. Java local y reconstruir el
devcontainer no son necesarios para la prueba en contenedor. Inspeccione CPU/RAM,
`df -B1`, `df -i`, contenedores, volúmenes y builders. Docker necesita **10 GiB
libres**: reserva de 3 GiB, crecimiento existente de 5 GiB y margen Java de 2 GiB.
Evidencia necesita 3.5 GiB libres; origen y snapshot de DB, 7 GiB cada uno. Si
comparten filesystem, los márgenes pueden acumularse: compruebe crecimiento real.
Las pruebas usan dos CPU, 1 GiB, un worker y repositorio Maven temporal nuevo.
Ejecute un trabajo cada vez. `/tmp` solo aporta capacidad si su montaje es distinto;
no amplía Docker. No borre recursos ajenos ni evidencias históricas.

Defina rutas absolutas reales, SHA revisado de 40 caracteres del checkout del
motor e identidad HTTPS esperada del consumidor. HEAD y origin del motor deben
coincidir. Una identidad `example.invalid` sin remoto es solo dato local declarado.

```bash
ENGINE=/absolute/golden-path-engine
CONSUMER=/absolute/my-java-service
ENGINE_SHA=REPLACE_WITH_REVIEWED_FULL_SHA
SERVICE_REPOSITORY=https://your-source-host.example/your-team/my-java-service
export PATH="$ENGINE/implementation/.tools/bin:$PATH"
make -C "$ENGINE/implementation" doctor
bash "$ENGINE/bin/deliver" init "$CONSUMER" \
  --profile java-http-consumer/v1 \
  --repository "$SERVICE_REPOSITORY" --engine-commit "$ENGINE_SHA"
git -C "$CONSUMER" init
git -C "$CONSUMER" add .
git -C "$CONSUMER" commit -m 'Initialize independent Java consumer'
bash "$ENGINE/bin/deliver" check --consumer "$CONSUMER"
```

`init` verifica el pin y rechaza destinos no vacíos; no copia el motor. `check`
comprueba inputs/modes Git inmutables, configuración, cadenas origin y herramientas;
no demuestra pruebas, análisis, admisión ni propiedad remota. Se capturan main,
test y recursos relativos. `service/target/` queda fuera tanto de inputs como del
contexto Docker. JAR/classes generados y configuración Maven adicional se rechazan.

## Pruebas, entrega y evidencia

Elija un directorio nuevo para cada intento de pruebas. Se retienen salida Maven,
estado del proceso, XML Surefire originales, hashes de artefactos e identidad del
contenedor. Informes ausentes, antiguos, malformados, vacíos, fallidos u omitidos
rechazan; un proceso fallido tampoco pasa aunque su XML parezca correcto.

```bash
TEST_OUTPUT=/absolute/fresh-java-test-evidence
python3 "$ENGINE/src/java-tests.py" "$CONSUMER/service" "$TEST_OUTPUT"
DB_STORAGE=/absolute/verified-database-storage
mkdir -p "$DB_STORAGE/cache" "$DB_STORAGE/snapshots"
export TRIVY_CACHE_DIR="$DB_STORAGE/cache"
export GP_VULNERABILITY_SNAPSHOT_ROOT="$DB_STORAGE/snapshots"
bash "$ENGINE/bin/deliver" local --consumer "$CONSUMER"
```

La entrega repite pruebas y verifica fuentes antes de construir y autorizar. Usa
bytes capturados, builder y JRE fijados por digest, sin Maven, cachés ni bibliotecas
de prueba en runtime. Los hashes de artefactos resueltos son observaciones: el POM
fijado **no es un lock completo** de transitivas.

Se conservan namespace `tfm-golden`, Deployment/contenedor `quotes-node`, actor
`deployer`, puerto 3000, límite 192 MiB y controles no-root, solo lectura, seccomp,
capabilities eliminadas y readiness. Presupuesto JVM: heap 64 MiB, metaspace 48 MiB,
code cache 24 MiB, stacks 256 KiB, Serial GC. Su aceptación real sigue pendiente.
`/healthz` responde desde el listener activo; `/version` identifica `independent-java`
y `BUILD_COMMIT` real; `/` devuelve el saludo determinista.

Siguen obligatorios siete controles y cuatro evidencias independientes. Procedencia
y resultados autentican perfil/productor Java exactos, repositorios/commits de
consumidor y motor, snapshots y hash de configuración. Java no satisface una
expectativa Node. Trivy analiza el digest entregado → CycloneDX validado → informe
de vulnerabilidades. Se adquieren explícitamente DB principal y DB identificadora
Java, se conservan snapshots y se verifican metadatos/hashes, sin actualizaciones
ambientales durante el análisis. Una DB antigua no es evaluación actual. Sin
bibliotecas de producción, no se demuestra cobertura general Java ni SBOM completo.

Use el directorio impreso por la entrega y su `.tar.gz` correspondiente:

```bash
RUN_DIRECTORY=/absolute/engine/implementation/evidence/raw/delivery-XXXXXXXX
ARCHIVE=/absolute/engine/implementation/evidence/packages/delivery-XXXXXXXX.tar.gz
python3 "$ENGINE/src/verify_package.py" "$ARCHIVE"
bash "$ENGINE/bin/deliver" cleanup "$RUN_DIRECTORY"
# Solo para prueba independiente interrumpida:
python3 "$ENGINE/src/java-tests.py" cleanup "$TEST_OUTPUT"
```

El verificador comprueba hashes externos/internos, no sustituye admisión. Cleanup
comprueba ID/propiedad inmutables y conserva evidencia; la salida normal retira
contenedores. Los snapshots DB se retienen fuera de Git para reproducción.

Diagnóstico: fuentes (`consumer-inputs.json`, `run.log`); pruebas/descargas Maven
(`unit-tests.log`, `java-test-exit.txt`, `java-test-reports/`); descarga imagen/tool
(salida original); DB/análisis (`database-download.log`, `java-database-download.log`,
`database-identity.json`, `sbom-generation.log`, `vulnerability-scan.log`); rechazo
(`analysis.json`, `admission-failure.json`). Errores de descarga no son pruebas
realizadas; errores de red/escáner no demuestran detección. Conserve intentos fallidos.

OIDC alojado, publicación pública, producción y catálogo completo: **NOT_EXECUTED**.
Licencia, custodia y revisión humana permanecen como decisiones separadas.
