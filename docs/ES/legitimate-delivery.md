# Una entrega legítima de quotes-node

[Guía](README.md) · [English](../EN/legitimate-delivery.md) ·
[Etapas y controles](how-it-works.md) · [Implementación](../../implementacion/docs/ES/architecture.md#organización-implementada-y-dependencias)

`bash bin/deliver local` construye una imagen quotes-node, comprueba y firma sus
evidencias, autoriza su despliegue en kind local efímero, observa la carga y
conserva evidencias antes de retirar los recursos propios.

<a id="preparar-y-ejecutar"></a>

## Requisitos y capacidad

Usa Linux AMD64, el entorno Codespaces/devcontainer fijado, Docker y red. Desde
la raíz del repositorio, añade las herramientas locales a PATH si hace falta,
instala las dependencias de esquemas solo si faltan y comprueba el entorno:

```bash
export PATH="$PWD/implementacion/.tools/bin:$PATH"
make -C implementacion setup-validation  # Solo si faltan las dependencias fijadas.
make -C implementacion doctor
```

Confirma la fuente en Git antes de ejecutar. Se rechazan cambios versionados y
archivos sin seguimiento en las entradas seleccionadas. Cada entrega recibe una
identidad nueva; no se admite reanudar ni seleccionar estado con `GP_STATE_DIR`.
Un reintento debe conservar el anterior.

Comprueba capacidad real; usa la raíz de Docker indicada por el comando:

```bash
nproc
free -h
docker info --format '{{.DockerRootDir}}'
df -h /workspaces /tmp /var/lib/docker
df -i /workspaces /tmp /var/lib/docker
docker system df
```

Conserva **3 GiB de reserva más crecimiento por operación**: inicialmente 5 GiB
para Docker en frío (unos **8 GiB libres en total**), 512 MiB para evidencias en
su filesystem y 2 GiB de trabajo de DB antes del análisis. Estos controles pueden
detener la ejecución; 32 GB nominales no equivalen a espacio libre. Un `/tmp`
separado no aumenta `/workspaces`. Ejecuta un solo clúster/integración local a la
vez. No reduzcas controles ni elimines recursos ajenos para forzar una ejecución.

## Ejecutar

Desde la raíz, después de las comprobaciones:

```bash
bash bin/deliver local
```

Una ruta absoluta de entrada funciona desde otro directorio. El perfil fijo usa
quotes-node, confianza local con clave de desarrollo, `tfm-golden` y el actor
restringido `deployer`. Consulta el [alcance actual](#alcance-actual).

La secuencia es fuente confirmada → pruebas de servicio/workflow → build → política
de manifiesto → SBOM original y análisis de vulnerabilidades → evidencia autenticada
y autorización de resultados → readiness y server dry-run autorizado → despliegue,
rollout, imagen efectiva y HTTP → limpieza/archivo. Siguen siendo obligatorios
`unitTests`, `manifestPolicy`, `workflowPolicy`, `vulnerabilityPolicy`, `signature`,
`sbom`, `provenance`. Un control obligatorio fallido o incompleto detiene las etapas
protegidas posteriores. Firma independiente, SBOM, procedencia y resultados siguen
siendo contratos separados.

<a id="interpretar-conservar-y-retirar"></a>

## Inspeccionar resultados y evidencias

El comando muestra `implementacion/evidence/raw/delivery-XXXXXXXX/`.
Consulta **`finalization.json` como resultado final del comando**, junto a su código
de salida. `result.json` y `delivery-steps.json` explican entrega/limpieza y estados:
`PASS`, rechazo atribuible `POLICY_REJECTED`, error operativo `ERROR` y
`NOT_REACHED`. Un código no cero no prueba detección. Fallos de registro, red,
verificador o evaluador no son rechazo atribuible; rollout, imagen efectiva y HTTP
son observaciones separadas de admisión.

El directorio conserva informes originales, bundles, verificaciones, entradas de
fuente/build y observaciones. El archivo está bajo `implementacion/evidence/packages/`.
Verifica hash externo y todos los internos con código confiable del checkout,
sustituyendo el identificador mostrado:

```bash
python3 src/verify_package.py \
  implementacion/evidence/packages/delivery-XXXXXXXX.tar.gz
```

El `result.json` archivado precede al empaquetado; `finalization.json` se escribe
junto a la evidencia raw después de cerrar el paquete. No deduzcas PASS final del
resultado archivado si falla el empaquetado; consulta `package-failure.json` cuando
exista. Los paquetes públicos excluyen `state.json`, credenciales, kubeconfig y
claves privadas. Recuperación queda en `implementacion/.tmp/`; no publiques estado
raw ni archivos privados. Conserva por separado los bytes identificados de la DB.

## Limpieza

La salida normal limpia recursos propios. Tras una interrupción, usa el checkout
original y la ruta absoluta del directorio raw:

```bash
bash bin/deliver cleanup \
  /workspaces/golden-path-lab/implementacion/evidence/raw/delivery-XXXXXXXX
```

Cleanup solo retira recursos. Valida IDs inmutables de contenedores y propiedad/
consumidores de volúmenes; rechaza recursos ajenos o modificados y conserva los
primeros diagnósticos y archivo. Fallos de limpieza o empaquetado no producen PASS.
Conserva intentos fallidos y material privado de recuperación.

## Alcance actual

La ruta disponible está fijada a **quotes-node local**. No incluye instalador,
plantilla independiente, API pública estable de configuración ni adaptador de
producción. Referencia, escenarios, medición y presentación pertenecen al
[laboratorio](../../lab/README.es.md). Claves locales no acreditan verificación
alojada OIDC/certificados/transparencia. Una ejecución correcta no establece
preparación para producción, conformidad DORA completa, SLSA Build L3, inventario
SBOM completo ni ausencia general de vulnerabilidades. Las ejecuciones históricas
validan sus revisiones registradas, no un checkout posterior. Véanse
[decisiones y siguiente incremento](../../implementacion/TODO.md#current-decisions-and-actions).

<details>
<summary>Avanzado: configuración conservada y compatibilidad</summary>

`GP_SOURCE_REPOSITORY` indica el repositorio HTTPS esperado (por defecto este).
`GP_VULNERABILITY_DB` selecciona una DB Trivy real existente; en otro caso se descarga
la del publicador. Cada ejecución conserva un snapshot inmutable nuevo y
`database-identity.json`. `GP_VULNERABILITY_SNAPSHOT_ROOT` permite ubicarlo en un
directorio absoluto canónico existente. Si es almacenamiento temporal, conserva
los bytes originales de forma duradera antes de cerrar Codespaces. No actualices
snapshots anteriores.

Rutas de motor/servicio/políticas/tooling/evidencias/privados son **rutas internas
derivadas**, registradas en `delivery-config.json`; se rechazan raíces con symlinks.
Véase el [contrato de módulos](../../implementacion/docs/ES/architecture.md#contrato-de-módulos).
`bash implementacion/scripts/deliver.sh local`, su cleanup y
`make -C implementacion deliver` delegan en la misma implementación. La procedencia
conserva el productor autorizado `implementacion/scripts/deliver.sh` y sigue
compatible `legitimate-delivery-package/v1`.

La [validación de mantenimiento](../EN/maintainers/delivery-core-validation.md#p01b-implementation-boundary--4-november-2026)
registra independencia con sparse checkout, revisiones exactas, hashes y
compatibilidad histórica. No cierra custodia ni revisión humana.

</details>
