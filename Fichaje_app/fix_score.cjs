const fs = require('fs');
let content = fs.readFileSync('/Users/jam/Documents/Fichaje_app/src/pages/Club/Games/Basketball/BasketballScorekeeper.tsx', 'utf8');

// Replace team_id with equipo
content = content.replace(/e\.team_id === match\?\.team_a\?\.id/g, "e.equipo === 'LOCAL'");
content = content.replace(/e\.team_id === match\?\.team_b\?\.id/g, "e.equipo === 'VISITANTE'");
content = content.replace(/match\.team_a\?\.name/g, "match.nombre_local");
content = content.replace(/match\.team_b\?\.name/g, "match.nombre_visitante");
content = content.replace(/match\.team_a\?\.short_name/g, "match.nombre_local");
content = content.replace(/match\.team_b\?\.short_name/g, "match.nombre_visitante");
content = content.replace(/teamId: \(activeTeamTab === 'A' \? match\.team_a\.id : match\.team_b\.id\)/g, "teamId: (activeTeamTab === 'A' ? 'LOCAL' : 'VISITANTE')");
content = content.replace(/team_id: selectedPlayer\.teamId/g, "equipo: selectedPlayer.teamId");
content = content.replace(/teamId: tId/g, "equipo: tId");

// For players: p.full_name -> p.nombre
content = content.replace(/p\.full_name/g, "p.nombre");
content = content.replace(/p\.number/g, "p.numero");

// Team panels
content = content.replace(/team=\{match\.team_a\}/g, "team={{name: match.nombre_local}}");
content = content.replace(/team=\{match\.team_b\}/g, "team={{name: match.nombre_visitante}}");
content = content.replace(/teamA=\{match\.team_a\}/g, "teamA={{name: match.nombre_local}}");
content = content.replace(/teamB=\{match\.team_b\}/g, "teamB={{name: match.nombre_visitante}}");

// Scores
content = content.replace(/score_a/g, "score_local");
content = content.replace(/score_b/g, "score_visitante");

fs.writeFileSync('/Users/jam/Documents/Fichaje_app/src/pages/Club/Games/Basketball/BasketballScorekeeper.tsx', content);
console.log('Done');
