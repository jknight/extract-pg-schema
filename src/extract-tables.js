import extractColumns from './extract-columns';
import parseComment from './parse-comment';

/**
 * @param {string} schemaName
 * @param {import('knex').Knex<any, unknown[]>} db
 * @returns {Promise<import('./types').TableOrView[]>}
 */
async function extractTables(schemaName, db) {
  /** @type {import('./types').TableOrView[]} */
  const tables = [];
  // Exclude partition tables
  const dbTables = await db
    .select('tablename')
    .distinct()
    .from('pg_catalog.pg_tables')
    .join('pg_catalog.pg_class', 'tablename', '=', 'pg_class.relname')
    .where('schemaname', schemaName)
    .andWhere('relispartition', '=', false);

  for (const table of dbTables) {
    const tableName = table.tablename;
    const tableCommentQuery = await db.schema.raw(
      `SELECT obj_description('"${schemaName}"."${tableName}"'::regclass)`
    );
    const rawTableComment =
      tableCommentQuery.rows.length > 0 &&
      tableCommentQuery.rows[0].obj_description;

    const columns = await extractColumns(schemaName, tableName, db);

    tables.push({
      name: tableName,
      ...parseComment(rawTableComment),
      columns,
    });
  }

  return tables;
}

export default extractTables;
