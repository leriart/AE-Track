/* ====================== MOTOR DE REGLAS ======================
 * Cada regla recibe (u, st, prev, R, info, etq, ctx), muta R con su estado
 * persistente (desde cuando, maximo progreso, etc.) y puede llamar a
 * pushAlert. evaluateUnit solo orquesta; asi se pueden anadir o quitar
 * reglas sin tocar el resto.
 */

