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
verificación independiente siguen perteneciendo al laboratorio. P03 no completa
la separación física ni ofrece una API pública estable, instalador, template
consumidor o adaptación a producción.

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

## Interpretar, conservar y retirar

Siguen vigentes las siete comprobaciones canónicas: `unitTests`, `manifestPolicy`,
`workflowPolicy`, `vulnerabilityPolicy`, `signature`, `sbom`, `provenance`.
Las pruebas del servicio deben ejecutarse y producir un resumen TAP satisfactorio;
un log no vacío no basta. Los resultados se emiten tras comprobar recibos de
éxito asociados a fuente/configuración/digest y autenticar nuevamente el registro.
No cambian `golden-path-v1`, tipos de predicado ni obligaciones de confianza.
La procedencia identifica `implementacion/scripts/deliver.sh`.

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
cd implementacion/scripts
python3 -c 'from lane_a_evidence import verify_package; import sys; verify_package(sys.argv[1])' \
  ../evidence/packages/delivery-XXXXXXXX.tar.gz
```

Si una interrupción deja recursos, desde la raíz y sustituyendo el identificador:

```bash
bash implementacion/scripts/deliver.sh cleanup \
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
