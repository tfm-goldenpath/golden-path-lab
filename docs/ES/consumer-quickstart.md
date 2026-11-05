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
comprobación funcional de este perfil. Configuración general, dependencias y Java
son incrementos posteriores. Pruebas y workflows proceden solo del consumidor;
si faltan o fallan, la entrega se detiene.

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

## Evidencia y retirada

La entrega imprime `implementation/evidence/raw/delivery-XXXXXXXX/` del motor.
Consulte `finalization.json`, `result.json` y `delivery-steps.json`: rechazo de
política, error operativo y etapa no alcanzada son distintos. Se retienen snapshots,
configuración y declaraciones autenticadas. Verifique todos los hashes:

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
