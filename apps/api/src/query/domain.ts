import database from '@/database';

const first = database.query.domains.findFirst().prepare('domains_first');

export default { first };
