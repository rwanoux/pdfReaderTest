import PDFExtractor from "./pdfExtractor.js";
Hooks.once('init', async function() {
    game.settings.register('pdfExtractor', 'pdfExtractor', {
        scope: 'world',
        config: false,
        type: Object,
        default: {
            pdfUrl: "",
            pdf: null,
            activePage: 1
        }
    });
});


Hooks.once('ready', async function() {

});


Hooks.on("renderSidebarTab", (app, html) => {
    if (app.options.id == "settings") {
        let button = $(`<button><i class="fas fa-download"></i> pdfExtractor</button>`)
        button.click(() => {
            let extractor = new PDFExtractor().render(true)
        })
        html.find("#settings-game").append(button)


    }
})