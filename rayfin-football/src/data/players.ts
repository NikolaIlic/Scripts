/**
 * Display names for players, keyed by the full legal name StatsBomb puts in the event feed.
 * Generated from ingest/data/lineups_69299.json (player_nickname). Add a match's lineup file
 * and regenerate to cover more teams; unknown players fall back to a name heuristic.
 */
const NICKNAMES: Record<string, string> = {
  "Adriano Correia Claro": "Adriano",
  "Andrés Iniesta Luján": "Andrés Iniesta",
  "Bojan Krkíc Pérez": "Bojan",
  "Carles Puyol i Saforcada": "Carles Puyol",
  "Cristiano Ronaldo dos Santos Aveiro": "Cristiano Ronaldo",
  "Daniel Alves da Silva": "Dani Alves",
  "David Villa Sánchez": "David Villa",
  "Eric-Sylvain Bilal Abidal": "Éric Abidal",
  "Gerard Piqué Bernabéu": "Gerard Piqué",
  "Gonzalo Gerardo Higuaín": "Gonzalo Higuaín",
  "Iker Casillas Fernández": "Iker Casillas",
  "Javier Alejandro Mascherano": "Javier Mascherano",
  "Jeffren Isaac Suárez Bermúdez": "Jeffrén",
  "Jerzy Dudek": "Jerzy Dudek",
  "José Manuel Pinto Colorado": "José Manuel Pinto",
  "Karim Benzema": "Karim Benzema",
  "Kléper Laveran Lima Ferreira": "Pepe",
  "Lassana Diarra": "Lass Diarra",
  "Lionel Andrés Messi Cuccittini": "Lionel Messi",
  "Mahamadou Diarra": "Mahamadou Diarra",
  "Marcelo Vieira da Silva Júnior": "Marcelo",
  "Maxwell Scherrer Cabelino Andrade": "Maxwell",
  "Mesut Özil": "Mesut Özil",
  "Pedro Eliezer Rodríguez Ledesma": "Pedro",
  "Pedro León Sánchez Gil": "Pedro León",
  "Raúl Albiol i Tortajada": "Raúl Albiol",
  "Ricardo Alberto Silveira de Carvalho": "Ricardo Carvalho",
  "Sami Khedira": "Sami Khedira",
  "Sergio Busquets i Burgos": "Sergio Busquets",
  "Sergio Ramos García": "Sergio Ramos",
  "Seydou Kéita": "Seydou Kéita",
  "Víctor Valdés Arribas": "Víctor Valdés",
  "Xabier Alonso Olano": "Xabi Alonso",
  "Xavier Hernández Creus": "Xavi",
  "Álvaro Arbeloa Coca": "Álvaro Arbeloa",
  "Ángel Fabián Di María Hernández": "Ángel Di María",
};

const PARTICLES = new Set(['da', 'de', 'do', 'dos', 'das', 'del', 'della', 'di', 'i', 'y', 'van', 'von', 'le', 'la']);

/** Common name, e.g. "Lionel Andrés Messi Cuccittini" -> "Lionel Messi". */
export function displayName(full: string): string {
  return NICKNAMES[full] ?? full;
}

/** Shortest recognisable label, e.g. "Lionel Messi" -> "Messi", "Xavi" -> "Xavi". */
export function shortName(full: string): string {
  const nick = NICKNAMES[full];
  if (nick) {
    const words = nick.split(' ');
    return words.length > 1 ? words[words.length - 1] : nick;
  }
  const words = full.split(' ').filter((w) => !PARTICLES.has(w.toLowerCase()));
  return words.length > 2 ? words[words.length - 2] : words[words.length - 1] ?? full;
}

/** Replace every known full name inside a sentence with its common name. */
export function withDisplayNames(text: string): string {
  let out = text;
  for (const [full, nick] of Object.entries(NICKNAMES)) {
    if (out.includes(full)) out = out.split(full).join(nick);
  }
  return out;
}
