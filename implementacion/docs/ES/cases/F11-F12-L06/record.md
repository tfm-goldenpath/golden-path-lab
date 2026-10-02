# F11 / F12 / L06: operaciones de ejecución

El [procedimiento manual F11 en A](../../manual-task-calibration.md) conserva
este oráculo y comprueba la corrección humana con los mismos controles.
La validación real del nuevo procedimiento y la calibración siguen pendientes.

La [matriz compartida](../../../EN/cases/F11-F12-L06/operations.json) se definió
antes de implementar sobre `d86465410d74e39ef8e77a9979995bcb268abf9a`, según los
requisitos del usuario. Se conservan los identificadores académicos. No se revisó
ni modificó la tesis. Revisión humana del oráculo y aceptación final: pendientes.

- **F11:** `privileged=true` junto con `allowPrivilegeEscalation=true`. El valor
  inicial `false` de escalada es incompatible con privilegios; son dos cambios
  coordinados para conservar validez Kubernetes, sin acceso al host ni exploits.
  Conftest debe devolver exactamente PRIVILEGED y ESCALATION. Admisión debe
  señalar únicamente `tfm-runtime/restricted-containers` y uno de esos campos.
- **F12:** cambiar solo la referencia de imagen al tag original de construcción,
  persistido en `buildTag`. GET de registro antes y después debe resolver al
  mismo digest autorizado; se conservan bytes y hashes. Conftest exige solo
  DIGEST; admisión, `authorized-image-repository` con IMAGE_REPOSITORY. No se
  retaggea, firma ni modifica el registro. `mutateDigest=false` y el alcance por
  repositorio/digest se mantienen. Las firmas autentican el digest de respaldo;
  no se afirma verificación de firmas sobre el tag, fuera de su alcance.
- **L06:** comparte CREATE de L01. Tras los UPDATE negativos, cambia únicamente
  una anotación de plantilla. Debe aumentar generación, cambiar plantilla,
  completar rollout y HTTP, y observar Pods Ready con digest y anotación nuevos.
  Un apply sin cambios no cumple. Se prueba además CREATE de Pod legal aislado
  y su limpieza, con nombres y etiquetas fuera del selector de quotes-node.

Orden: evidencia válida y autorización → CREATE negativos con objeto ausente →
CREATE L01/L06 → UPDATE legales de plantilla negativos → UPDATE L06 → Pod legal.
Los Pods del controlador se observan por separado. No hay UPDATE de campos
inmutables de Pod. Cada CREATE rechazado exige un NotFound real antes y después;
los errores API no prueban ausencia. UPDATE rechazado debe conservar UID,
generación y spec deseado; status y resourceVersion pueden cambiar normalmente.

Las solicitudes usan `actor` con privilegios existentes; `k` se limita a observar
y limpiar recursos propios. Políticas, identidad, namespace y evidencias se
mantienen constantes. Errores de API, RBAC, firmas, transporte o webhook, denegaciones
adicionales y aceptación inesperada detienen el ensayo y conservan evidencias.
La limpieza no convierte un fallo en éxito. Los resultados compartidos L01/L06
no aumentan los veinte escenarios. Véase el [oráculo detallado en inglés](../../../EN/cases/F11-F12-L06/record.md).
