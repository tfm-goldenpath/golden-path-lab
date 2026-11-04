# Una entrega legítima de quotes-node (P03)

[Guía](README.md) · [English, guía canónica](../EN/legitimate-delivery.md) ·
[Validación](../EN/maintainers/delivery-core-validation.md)

El coordinador local construye y publica una imagen en zot efímero, aplica los
controles, firma y verifica las evidencias independientes, autoriza resultados y
solicita el despliegue en kind mediante el actor restringido. Comprueba por separado
rollout, digest efectivo de Deployment/Pods y HTTP. Conserva evidencias y retira
solamente recursos identificados como propios.

No ejecuta referencia R, fallos, comparaciones, mediciones ni presentación. Una
entrega individual no demuestra L01 completo: su sustitución por otro digest y
verificación independiente siguen perteneciendo al laboratorio. La separación física cubre esta ruta local: motor en `src/` y adaptador explícito
kind/zot/buildx. No ofrece una API pública estable, instalador, template consumidor
o adaptación a producción ni separa todo el repositorio.

## Preparar y ejecutar

Desde `/workspaces/golden-path-lab`, con Linux AMD64 y las herramientas fijadas:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
# Solo si faltan las dependencias de validación fijadas:
make -C implementacion setup-validation
make -C implementacion doctor
make -C implementacion test
nproc
free -h
df -h /workspaces /tmp /var/lib/docker
df -i /workspaces /tmp /var/lib/docker
docker system df
# Entrada actual:
bash bin/deliver local
# Compatibilidad conservada:
bash implementacion/scripts/deliver.sh local
# Alternativa equivalente:
make -C implementacion deliver
```

Debe existir un commit del candidato sin modificaciones rastreadas; los inputs
seleccionados tampoco admiten archivos sin seguimiento. Los archivos npm ajenos
de la raíz quedan fuera. La captura explícita conserva servicio, tests del
servicio, reglas Docker, políticas, esquemas, workflows, locks y controles usados;
no lee escenarios, fixtures, planes o estado de presentación.

Comprueba recursos reales, no solo `hostRequirements`. Reserva al menos 3 GiB más
el crecimiento previsto. La previsión inicial en Docker es 5 GiB adicionales
(8 GiB libres), y 512 MiB adicionales en el destino de evidencia, más una previsión de 2 GiB para la base antes del análisis; no es garantía
universal. Repite almacenamiento antes de cada integración, después de build y
empaquetado, tras cleanup y ante errores de escritura. Ejecuta un solo laboratorio
activo. No retires recursos anteriores ni borres evidencias para obtener espacio
sin comprobar propiedad, consumidores y conservación.

El perfil fija quotes-node, base actual, confianza local, namespace `tfm-golden`
y actor `system:serviceaccount:tfm-golden:deployer`. `GP_SOURCE_REPOSITORY` selecciona
el origen HTTPS esperado; por defecto es este repositorio. `GP_VULNERABILITY_DB`
puede seleccionar una base real existente; se conserva una copia nueva identificada.
`GP_VULNERABILITY_SNAPSHOT_ROOT` permite ubicarla en un directorio absoluto canónico
existente. Si es temporal, conserva los bytes originales en almacenamiento duradero
antes de terminar el Codespace. Nunca actualices un snapshot histórico.

Cada intento crea `implementacion/evidence/raw/delivery-XXXXXXXX/` y material
privado de recuperación bajo `implementacion/.tmp/private-XXXXXXXX/`.
`delivery-config.json` y el estado identifican configuración, fuente, imagen,
confianza, base, recursos y responsable de cleanup. No hay reanudación: se rechaza
`GP_STATE_DIR`; cada reintento tiene identidad independiente.

Las raíces internas se resuelven desde la entrada y se registran en
`delivery-config.json`; se rechazan raíces con enlaces simbólicos. `bin/deliver`
delega en `src/run-delivery.sh`; `src/lib/` contiene contexto, entrega, confianza,
workload ordinario y adaptador local. Los contratos, capturas y herramientas de
archivo están en `src/`. Políticas, esquemas, versiones, `tools.lock.json`,
`tooling/` y el servicio seleccionado permanecen bajo `implementacion/`.

La captura incluye `bin/` y `src/` y verifica bytes y permisos ejecutables contra
el commit. La prueba aislada usa un checkout disperso del commit real y declara
esa proyección; no inventa una revisión ni modifica hashes históricos. Los
coordinadores del laboratorio consumen el motor compartido mediante adaptadores;
el producto no los importa. Véase la [navegación de laboratorio](../../lab/README.es.md).

## Interpretar, conservar y retirar

Orden: fuente comprometida → entorno/tests/workflows → build y política de
manifiesto → SBOM original y vulnerabilidades → evidencia autenticada → resultados
→ readiness de admisión → despliegue/rollout/digest/HTTP → retirada y archivo.
Un fallo obligatorio detiene las fases protegidas posteriores.

Siguen vigentes las siete comprobaciones canónicas: `unitTests`, `manifestPolicy`,
`workflowPolicy`, `vulnerabilityPolicy`, `signature`, `sbom`, `provenance`.
Las pruebas del servicio deben ejecutarse y producir un resumen TAP satisfactorio;
un log no vacío no basta. Los resultados se emiten tras comprobar recibos de
éxito asociados a fuente/configuración/digest y autenticar nuevamente el registro.
No cambian `golden-path-v1`, tipos de predicado ni obligaciones de confianza.
Se conserva la identidad autorizada de procedencia: `bin/deliver`.

Admisión comprueba políticas, controller, endpoints, inventario autorizado y un
CREATE real en dry-run del candidato mediante el actor. No provoca antes F13.
Después se comprueban solicitud de despliegue, rollout, digest y HTTP.
`result.json` y `delivery-steps.json` distinguen `PASS`, `POLICY_REJECTED`, `ERROR`
y fases `NOT_REACHED`. Los fallos devuelven código no cero; un error de transporte,
registro o autenticación no demuestra rechazo atribuible. Cleanup o empaquetado
fallidos tampoco producen éxito global; `package-failure.json` identifica este
último cuando corresponda. `finalization.json`, conservado junto al paquete tras
cerrarlo, indica el resultado global incluyendo empaquetado; `result.json` archivado
describe entrega y cleanup anteriores a ese paso. No infieras éxito global de este
último si falla la finalización.

El paquete `evidence/packages/delivery-XXXXXXXX.tar.gz` usa
`legitimate-delivery-package/v1`, sin resultados Fxx/Lxx ficticios. Conserva informes
originales, hashes, versiones, asociación de la base, bundles, admisión, Pods y HTTP.
Excluye estado privado, credenciales, kubeconfig y claves privadas. Verificación
con código confiable del repositorio:

```bash
python3 src/verify_package.py \
  implementacion/evidence/packages/delivery-XXXXXXXX.tar.gz
```

Si una interrupción deja recursos, desde la raíz y sustituyendo el identificador:

```bash
bash bin/deliver cleanup \
  /workspaces/golden-path-lab/implementacion/evidence/raw/delivery-XXXXXXXX
```

Se verifican IDs inmutables de contenedores y metadatos/consumidores de volúmenes.
Los recursos distintos se conservan con error. Repetir cleanup conserva primeros
diagnósticos y paquete; no reanuda ni vuelve a autorizar. Conserva también fallos,
bases originales y recuperación privada. No se cierra custodia ni revisión humana
P00, y no se presupone que la release mutable contenga todos los directorios locales.

La vía alojada mantiene su coordinador y workflow actuales. Esta nueva invocación
no tiene modo hosted; kind y claves locales no demuestran OIDC, certificados o
transparencia GitHub. Consulta el registro de validación para los SHAs, resultados
reales y comprobaciones pendientes.

El [registro de mantenimiento de dependencias](../EN/maintainers/dependency-refresh-validation.md)
recoge la compatibilidad actual de AJV y formatos, separada de las ejecuciones históricas de P03.
