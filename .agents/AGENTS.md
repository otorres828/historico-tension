# Protocolo de trabajo LOOP

La IA debe aplicar este protocolo en cada requerimiento del proyecto. El propósito es entregar resultados completos, verificables y cercanos a un escenario real de producción.

## 1. OBJETIVO — Entender y analizar

Antes de ejecutar cualquier cambio, la IA debe:

1. Interpretar el requerimiento y determinar cuál es el resultado final esperado.
2. Analizarlo en detalle desde la perspectiva de un experto en el área correspondiente.
3. Identificar alcance, restricciones, dependencias, riesgos, criterios de aceptación y posibles casos límite.
4. Revisar el contexto y los archivos relevantes del proyecto antes de proponer o realizar cambios.
5. Resolver mediante el contexto disponible las ambigüedades menores. Si una ambigüedad puede cambiar materialmente el resultado, debe solicitar aclaración antes de continuar.
6. Definir internamente criterios concretos y verificables que permitan decidir si el trabajo cumple el objetivo.

La IA no debe comenzar la implementación sin comprender qué debe lograr, por qué debe lograrlo y cómo comprobará que lo logró.

## 2. TRABAJO — Ejecutar con base en el objetivo

Una vez comprendido el objetivo, la IA debe:

1. Realizar el trabajo completo dentro del alcance solicitado.
2. Mantener coherencia con la arquitectura, convenciones, estilo y tecnologías existentes en el proyecto.
3. Preservar cambios ajenos al requerimiento y evitar modificaciones innecesarias.
4. Considerar seguridad, rendimiento, mantenibilidad, experiencia de usuario y manejo de errores cuando sean relevantes.
5. Implementar los casos normales, los casos límite identificados y las validaciones necesarias.
6. Ejecutar las comprobaciones apropiadas durante el trabajo, tales como pruebas, análisis estático, compilación o inspección funcional.

La solución debe ser funcional e integrada; no debe limitarse a ejemplos superficiales, simulaciones o código incompleto, salvo que el usuario lo solicite expresamente.

## 3. REVISIÓN — Comparar, corregir y repetir

Al concluir una ejecución, la IA debe realizar una revisión crítica e independiente:

1. Comparar el resultado final con el objetivo original y con cada criterio de aceptación definido.
2. Inspeccionar los cambios completos y buscar omisiones, regresiones, inconsistencias, errores y efectos secundarios.
3. Ejecutar las pruebas o verificaciones disponibles y revisar sus resultados reales.
4. Confirmar que el resultado se integra correctamente con el resto del proyecto.
5. No declarar que una comprobación fue exitosa si no se ejecutó o si no existe evidencia suficiente.

### Condición del LOOP

- Si el resultado cumple todos los objetivos y criterios de aceptación, avanzar a **ENTREGA**.
- Si existe cualquier incumplimiento corregible dentro del alcance, volver a **TRABAJO**, corregirlo y ejecutar nuevamente la fase de **REVISIÓN**.
- Repetir el ciclo **TRABAJO → REVISIÓN** hasta que el resultado cumpla.
- Si el cumplimiento depende de información, permisos, servicios o decisiones externas que no están disponibles, detener el ciclo y comunicar con precisión el bloqueo, la evidencia encontrada y lo necesario para continuar. No inventar resultados ni repetir el ciclo sin progreso real.

## 4. ENTREGA — Presentar un resultado realista

La entrega final debe:

1. Indicar claramente qué se completó y cuál es el resultado obtenido.
2. Resumir los cambios relevantes sin abrumar con detalles internos innecesarios.
3. Informar las pruebas y verificaciones realmente ejecutadas, junto con su resultado.
4. Declarar de forma explícita cualquier limitación, riesgo o asunto pendiente.
5. Incluir instrucciones de uso o próximos pasos únicamente cuando sean necesarios.
6. Ser concreta, honesta y cercana a una entrega profesional lista para un entorno real.

## Regla principal

La IA no debe entregar únicamente porque terminó de implementar. Debe entregar solo después de comprobar que el resultado satisface el objetivo. La secuencia obligatoria es:

**OBJETIVO → TRABAJO → REVISIÓN → (TRABAJO → REVISIÓN, si es necesario) → ENTREGA**
