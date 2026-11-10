# Consumidor Node independiente

[Guía](README.md) · [English](../EN/consumer-quickstart.md)

La plantilla crea un repositorio Git separado con servicio HTTP, pruebas,
paquete sin dependencias externas y bloqueo, Dockerfile, exclusiones, un workflow
CI y `golden-path.json`. El propietario mantiene esos archivos. El motor fijado
en otro checkout mantiene herramientas, políticas, esquemas, verificación e
infraestructura temporal. El consumidor no contiene laboratorio ni copias del motor.

## Crear y fijar

Utilice las herramientas fijadas del devcontainer/Codespaces Linux AMD64 y las
[comprobaciones de capacidad](legitimate-delivery.md#preparar-y-ejecutar).
Docker requiere **3 GiB de reserva más 5 GiB de crecimiento en frío**; evidencia y
base de datos tienen sus propios márgenes. Inspeccione `/tmp`, memoria,
contenedores, volúmenes y builders. Ejecute una entrega cada vez; no elimine
recursos ajenos ni evidencias para liberar espacio.

Seleccione un **SHA completo de 40 caracteres revisado**. Sustituya los valores
por rutas absolutas reales, ese SHA y la identidad HTTPS real de su repositorio:

```bash
ENGINE=/absolute/golden-path-engine
CONSUMER=/absolute/my-service
ENGINE_SHA=REPLACE_WITH_REVIEWED_FULL_SHA
SERVICE_REPOSITORY=https://your-source-host.example/your-team/your-service
git clone --no-checkout https://github.com/tfm-goldenpath/golden-path-lab "$ENGINE"
git -C "$ENGINE" fetch origin "$ENGINE_SHA"
git -C "$ENGINE" checkout --detach "$ENGINE_SHA"
export PATH="$ENGINE/implementation/.tools/bin:$PATH"
# Herramientas fijadas del devcontainer; instalar dependencias de validación solo si faltan.
make -C "$ENGINE/implementation" setup-validation
make -C "$ENGINE/implementation" doctor
bash "$ENGINE/bin/deliver" init "$CONSUMER" \
  --repository "$SERVICE_REPOSITORY" --engine-commit "$ENGINE_SHA"
git -C "$CONSUMER" init
git -C "$CONSUMER" add .
git -C "$CONSUMER" commit -m 'Initialize independent Node consumer'
```

Puede reutilizar un checkout verificado. `init` rechaza destinos no vacíos y
comprueba HEAD, origin y bytes seleccionados del motor contra el pin. No copia el
motor. `golden-path.json` es configuración versionada y bloqueo: rechaza campos
desconocidos, referencias móviles y rutas arbitrarias. Confirme cambios antes de
entregar. Si existe origin del consumidor, debe coincidir con la identidad HTTPS
esperada. La verificación local comprueba bytes Git y la cadena origin, no que
un servidor remoto aloje o autentique el código. La ausencia de origin queda
como no verificada. `example.invalid` en la prueba mantenedora es solo una
identidad local declarada, nunca un repositorio alojado real.

## Comprobar y entregar

Desde el consumidor o cualquier directorio:

```bash
bash "$ENGINE/bin/deliver" check --consumer "$CONSUMER"
npm ci --prefix "$CONSUMER/service" --ignore-scripts --no-audit --no-fund
npm test --prefix "$CONSUMER/service"
bash "$ENGINE/bin/deliver" local --consumer "$CONSUMER"
```

Perfil `node-http-consumer/v1`: Node 24 sin dependencias externas, contexto
`service/`, Dockerfile y `.dockerignore` suministrados, Linux AMD64, UID/GID 10001,
sistema de archivos de solo lectura y puerto 3000. Deployment/contenedor
`quotes-node`, namespace `tfm-golden` y actor restringido `deployer` son fijos.
`/healthz` devuelve `{"status":"ok"}`; `/version` identifica `independent-node`
y `BUILD_COMMIT` del consumidor; `/` conserva el saludo de la plantilla como
comprobación funcional de este perfil. Configuración general y dependencias siguen siendo incrementos posteriores.
La [prueba Java acotada](java-consumer-quickstart.md) tiene perfil y límites propios. Pruebas y workflows proceden solo del consumidor;
si faltan o fallan, la entrega se detiene. Las pruebas se ejecutan desde `service/`:
las rutas relativas y `./package.json` pertenecen al consumidor. El inventario
completo se verifica contra el commit fijado, independientemente del índice;
borrar un archivo versionado detiene la entrega.

Siguen siendo obligatorios `unitTests`, `manifestPolicy`, `workflowPolicy`,
`vulnerabilityPolicy`, `signature`, `sbom`, `provenance`. Firma de imagen, SBOM,
procedencia y resultados son evidencias independientes. Antes de construir y
autorizar se recomprueban bytes Git y modos de archivos de consumidor y motor.
La procedencia firmada identifica el commit del consumidor y su productor
explícito. Procedencia y resultados vinculan repositorio/commit del motor, hash de
sus entradas, hash del consumidor y hash de configuración. La verificación usa
valores esperados de configuración de ejecución; admisión repite esas condiciones
y los requisitos existentes de cuatro evidencias y runtime. Pruebas, workflow,
esquema completo del SBOM, asociación del análisis y snapshots se verifican antes;
admisión no vuelve a ejecutarlos. Consulte [controles](how-it-works.md) y
[contratos](../../implementation/docs/ES/delivery-contracts.md).

## Puerta optativa de pruebas y cobertura

`quality` ejecuta una vez el perfil existente `node --test test/*.test.js` con
cobertura nativa de Node **24.22.1**. Requiere Linux, Python 3 y Git, sin Docker,
instalación npm, dependencias de cobertura ni servicios externos. Compara líneas,
funciones y ramas ejecutadas con umbrales revisados. La cobertura no demuestra
calidad de las aserciones, ausencia de vulnerabilidades ni cumplimiento normativo.

Para activarla, seleccione una revisión revisada del motor con este comando y
actualice su SHA completo en `golden-path.json`. Añada esta configuración completa
e integre el workflow actualizado mediante el mismo cambio revisado en Git:

```bash
cat > "$CONSUMER/service/quality-gate.json" <<'JSON'
{
  "schema": "node-quality-gate/v1",
  "include": ["src/"],
  "exclude": ["src/index.js"],
  "thresholds": {"lines": 80, "functions": 80, "branches": 70},
  "limits": {"timeoutSeconds": 120, "maxOutputBytes": 4194304, "workers": 2}
}
JSON
# Para una plantilla sin cambios; concilie antes sus workflows personalizados.
cp "$ENGINE/templates/node-http/.github/workflows/ci.yml" "$CONSUMER/.github/workflows/ci.yml"
git -C "$CONSUMER" diff
git -C "$CONSUMER" add golden-path.json service/quality-gate.json .github/workflows/ci.yml
git -C "$CONSUMER" commit -m 'Enable reviewed Node test and coverage gate'
bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER"
# Opcional: el padre debe existir; cada directorio de salida será nuevo y externo al consumidor.
QUALITY_OUTPUT=/absolute/evidence/new-quality-run
bash "$ENGINE/bin/deliver" quality --consumer "$CONSUMER" --output "$QUALITY_OUTPUT"
bash "$ENGINE/bin/deliver" quality --verify "$QUALITY_OUTPUT"
```

Puede usar cualquier directorio de trabajo. Los ejemplos crean dos ejecuciones
separadas; normalmente elija uno. El archivo queda capturado con todas las entradas
comprometidas de `service/` y participa en la identidad del consumidor. Cambios sin
commit, archivos adicionales, entradas ausentes y enlaces siguen causando error.
No hay campos de comandos. `include` y `exclude` admiten archivos literales
`.js`/`.mjs`/`.cjs` o prefijos de directorio terminados en `/`, bajo `src/`, sin
patrones glob. Cada entrada debe corresponder a código comprometido; el alcance
final vacío es inválido. La exclusión explícita `src/index.js` deja fuera el punto
de arranque que abre el socket; revise esa decisión para su aplicación.

80/80/70 es una propuesta práctica, no un estándar de la industria ni una garantía.
Cambie umbrales (0–100), alcance y exclusiones con un commit revisado; nunca se
relajan automáticamente. Límites: timeout de 1–300 segundos, salida de 4 KiB–16 MiB
y 1–2 workers. El runner limita el heap Node a 256 MiB por proceso, copia hasta
16 MiB/1.000 archivos y comprueba el crecimiento agregado (16 MiB más el límite de
salida). Exige reserva de 3 GiB más 64 MiB de crecimiento previsto en almacenamiento
de trabajo y evidencia. Son límites cooperativos, no aislamiento frente a código
hostil ni cuota de memoria del sistema operativo. Las pruebas usan la identidad
del usuario: revíselas y ejecute CI sin secretos. Una tarea pesada cada vez.

| Resultado | Salida | Interpretación |
| --- | ---: | --- |
| PASS | 0 | Pruebas reales satisfactorias y métricas suficientes. |
| FAIL | 1 | Fallo de pruebas o umbral concreto incumplido. |
| ERROR | 2 | Entradas/configuración inválidas, interrupción, evidencia inválida o fallo de colección/limpieza. |
| NOT_EXECUTED | 0 | Control Node ausente; `quality` no ejecutó pruebas ni aceptó cobertura. |
| NOT_APPLICABLE | 0 | Perfil Java; su cobertura queda fuera del incremento. |

La [documentación de la versión Node](https://nodejs.org/download/release/v24.22.1/docs/api/test.html#collecting-code-coverage)
describe el recolector experimental. Solo informa archivos cargados. La puerta
obtiene el conjunto esperado del inventario comprometido: un archivo esperado no
importado produce ERROR. No importa código artificialmente para subir la cifra.
Informes ausentes/truncados, cero pruebas reales, pruebas omitidas/TODO, supresión
inline y métricas inválidas/desconocidas no permiten PASS. Un denominador cero no
es 100%: es no aplicable, y un umbral agregado no evaluable produce ERROR. Se comparan
los conteos originales; solo se redondea la presentación.

El comando imprime su directorio nuevo `implementation/evidence/raw/quality-*/`.
Consulte `summary.txt`, `result.json`, `tests.log`, `coverage.ndjson` original,
`quality-gate.json`, `effective-config.json`, `inputs.json`, `scope.json`, versiones
y recibos de comando/ejecución. `checksums.json` recoge hashes; `--verify` comprueba
inventario y bytes. Un error previo de ruta puede quedar solo en consola; el fallo
de sellado produce ERROR y, si es posible, `finalization-error.json`. Conserve el
primer fallo. `recoveryWork` identifica trabajo retenido sin presumir retirada
segura. Estos hashes locales no son atestaciones firmadas ni autorización de entrega.
La asociación incluye identidad de ejecución, copias verificadas y recomprobación/
vigilancia de entradas originales; un commit declarado por el informe no basta.
Conserve aparte el hash del propio manifiesto al transferir evidencia.

El CI actualizado descarga el motor por su SHA completo configurado y comprueba
origin, HEAD y bytes comprometidos con el mismo comando. Ejecuta las pruebas una
vez. FAIL y ERROR hacen fallar el job; el resumen muestra métricas, umbrales y
motivos, y los artefactos se conservan también ante rechazo. Sin configuración,
continúan las pruebas npm habituales y cobertura figura como NOT_EXECUTED. Los
workflows de consumidores existentes deben adoptar esta integración expresamente.
Fallar un job y exigirlo para merge son decisiones distintas: no se cambian reglas
de protección. Validar una copia local generada no acredita un consumidor alojado.

`check`, `local`, `cleanup`, Java, las siete comprobaciones de resultados y las
cuatro evidencias autenticadas independientes mantienen su contrato. Esta puerta
no añade una condición de admisión Kubernetes. El [registro de validación en inglés](../EN/maintainers/consumer-quality-validation.md)
distingue revisión, casos observados y pendientes.

## Evidencia y retirada

La entrega imprime `implementation/evidence/raw/delivery-XXXXXXXX/` del motor.
Consulte `finalization.json`, `result.json` y `delivery-steps.json`: rechazo de
política, error operativo y etapa no alcanzada son distintos. Se retienen snapshots,
configuración y declaraciones autenticadas. El formato del archivo conserva
`delivery-v1` / `legitimate-delivery-package/v1`; el resumen distingue la ejecución
mediante `executionProfile: consumer-v1`. Verifique todos los hashes:

```bash
python3 "$ENGINE/src/verify_package.py" \
  "$ENGINE/implementation/evidence/packages/delivery-XXXXXXXX.tar.gz"
# Solo si una interrupción exige retirar recursos:
bash "$ENGINE/bin/deliver" cleanup \
  "$ENGINE/implementation/evidence/raw/delivery-XXXXXXXX"
```

La salida normal retira recursos propios mediante recibos de identidad inmutable.
Cleanup rechaza recursos ajenos y conserva evidencia, archivo y fallo originales.
La recuperación privada queda en `implementation/.tmp/` del motor: no comparta
estado bruto, claves ni credenciales; se excluyen del paquete público. Consulte
[semántica de evidencia](legitimate-delivery.md#interpretar-conservar-y-retirar).

Claves locales no demuestran OIDC GitHub, preparación para producción, inventario
SBOM completo ni conformidad DORA plena. Firma alojada, publicación pública de
imágenes y clústeres de producción: **NOT_EXECUTED**. Licencia y canal privado de
seguridad siguen pendientes del propietario. Revisiones exactas, intentos fallidos
y límites: [recibo mantenedor en inglés](../EN/maintainers/independent-consumer-validation.md).
