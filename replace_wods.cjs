const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    path.join(__dirname, 'src', 'pages', 'WODs.tsx'),
    path.join(__dirname, 'src', 'pages', 'CreateWOD.tsx')
];

const replacements = [
    { regex: />Novo WOD</g, replacement: '>Novo Evento<' },
    { regex: />WOD</g, replacement: '>Evento<' },
    { regex: />WODs</g, replacement: '>Eventos<' },
    { regex: /Nome do WOD/g, replacement: 'Nome do Evento' },
    { regex: /Descrição do WOD/g, replacement: 'Descrição do Evento' },
    { regex: /Ordem dos WODs/g, replacement: 'Ordem dos Eventos' },
    { regex: /WOD atualizado/g, replacement: 'Evento atualizado' },
    { regex: /WOD criado/g, replacement: 'Evento criado' },
    { regex: /WOD excluído/g, replacement: 'Evento excluído' },
    { regex: /WODs da Categoria/g, replacement: 'Eventos da Categoria' },
    { regex: /Adicionar WOD/g, replacement: 'Adicionar Evento' },
    { regex: /dos WODs/g, replacement: 'dos Eventos' },
    { regex: /do WOD/g, replacement: 'do Evento' },
    { regex: /ao WOD/g, replacement: 'ao Evento' },
    { regex: /Editar WOD/g, replacement: 'Editar Evento' },
    { regex: /este WOD/g, replacement: 'este Evento' },
    { regex: /Tipo de WOD/g, replacement: 'Tipo de Evento' },
    { regex: /Excluir WOD\?/g, replacement: 'Excluir Evento?' },
    { regex: /Ordem do WOD/g, replacement: 'Ordem do Evento' },
    { regex: />Gerenciar WODs</g, replacement: '>Gerenciar Eventos<' },
    { regex: /Gestão de WODs/g, replacement: 'Gestão de Eventos' },
    { regex: /Gerenciamento de WODs/g, replacement: 'Gerenciamento de Eventos' },
    { regex: /Nenhum WOD/g, replacement: 'Nenhum Evento' }
];

filesToUpdate.forEach(file => {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        let original = content;

        replacements.forEach(({ regex, replacement }) => {
            content = content.replace(regex, replacement);
        });

        if (content !== original) {
            fs.writeFileSync(file, content, 'utf8');
            console.log('Updated texts in:', file);
        }
    } else {
        console.log('File not found:', file);
    }
});
