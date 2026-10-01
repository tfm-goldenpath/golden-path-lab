# F03 / F04 / L02: análisis posterior a la construcción

La [ficha principal](../../../EN/cases/F03-F04-L02/record.md) y la
[matriz compartida](../../../EN/cases/F03-F04-L02/oracles.json) definen el oráculo.
Base: `eed5aad2828a7156e4c49bf2e2f3d9c2b0476137`. Revisión humana pendiente.
No se afirma detección en la fase de PR ni medición de campaña.

| Caso | Dependencia de producción aislada | Resultado esperado |
| --- | --- | --- |
| F03 vulnerable | minimist 1.2.5, CVE-2021-44906 CRITICAL | VULNERABILITY_BLOCK atribuible al hallazgo seleccionado |
| F03 corregido | minimist 1.2.8 | Desaparece el objetivo, umbral global aprobado, compatibilidad y entrega autorizada nueva |
| F04 | ip 2.0.1, CVE-2024-29415 HIGH | Bloqueo con la misma política; sin corrección en el ámbito npm/advisory/base congelada documentado |
| L02 | lodash.unset 4.5.2, CVE-2026-2950 MEDIUM | MEDIUM presente, ningún HIGH/CRITICAL, autorización/admisión/rollout/HTTP |

Los cuatro análisis reales de paquetes con Trivy 0.74.0 confirmaron estos
candidatos. L02 también presenta CVE-2025-13465 MEDIUM. La existencia de una
corrección se contrasta con las fuentes oficiales enlazadas en la ficha; un
FixedVersion vacío no demuestra ausencia universal. Las comprobaciones inocuas
de dependencias pasaron; minimist produjo resultados idénticos antes/después.
Las imágenes siguen pendientes: los componentes deben aparecer en su SBOM real.
Las dependencias vulnerables no entran en el servicio normal.

La secuencia común es imagen → CycloneDX original → `trivy sbom` real → Conftest.
El informe conserva `ArtifactType=cyclonedx`; no se renombra a container_image.
Se contrastan Reference, RepoDigests, ImageID y la identidad del SBOM con la imagen.
Una base congelada se comparte entre las cuatro imágenes, verificando los hashes
antes/después de cada análisis. Se conservan sus bytes fuera de Git; el paquete
contiene metadatos, hashes y ubicación. No hay ignore-unfixed ni excepciones al
bloqueo HIGH/CRITICAL. Errores de análisis/evaluación no cuentan como detección.

Desde la raíz:

```bash
make -C implementacion doctor
make -C implementacion test
GP_VULNERABILITY_DB="$PWD/implementacion/.tmp/vulnerability-selection/db-snapshot" \
  make -C implementacion vulnerabilities
```

Sin la variable se descarga y congela una base actual. Si cambia el hallazgo, se
invalida el ensayo. F03 vulnerable solo puede probar HTTP en R; los negativos
nunca reciben resultados exitosos ni despliegue protegido. Ambos positivos
requieren evidencia propia, actor restringido, Pods Ready con el digest esperado
y HTTP. El coordinador conserva fallos y limpia únicamente sus recursos.

Evidencia de desarrollo: `implementacion/evidence/raw/vulnerability-development/`.
Se ejecutaron análisis de filesystem y de un SBOM de imagen anterior para
caracterizar el contrato, no análisis de imágenes de estos casos. Un primer
intento falló antes de que terminara la copia de la base; su log queda conservado.
`doctor` detectó kubectl 1.37.0 frente a 1.35.8 fijado: construcción/análisis de
imágenes nuevas y admisión **NOT_EXECUTED**. Se mantienen bloqueos locales previos.
Resultados de pruebas en [completion.json](../../../EN/cases/F03-F04-L02/completion.json).

No existe ejecución hosted de estos fixtures. `github vulnerabilities` se rechaza.
La regresión hosted normal solo puede despacharse tras autorización independiente
para publicar una revisión revisada:

```bash
gh workflow run golden-path.yml --repo tfm-goldenpath/golden-path-lab \
  --ref <rama-o-etiqueta-publicada-y-revisada>
gh run list --repo tfm-goldenpath/golden-path-lab --workflow golden-path.yml --limit 5
```

No se hizo push ni dispatch. Un éxito normal no completa F03/F04/L02 hosted.
Siguen pendientes F09/F10/L05 y F13/F14. Se mantienen veinte escenarios.
Asistencia: Codex, GPT-6 según la sesión; identificador de despliegue no expuesto.
Implementación, investigación, pruebas y documentación; revisión y decisión
humanas pendientes.

Para prerrequisitos independientes, la suite existente y conservación de fallos/bases de datos, use la [validación del carril A](../../lane-a-validation.md). Los intentos locales actuales se detienen en doctor; no cierran las barreras de integración pendientes de este caso.
