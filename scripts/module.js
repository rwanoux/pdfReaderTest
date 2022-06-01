import PDFExtractor from "./pdfExtractor.js";
Hooks.once('init', async function() {

});
let text = ""
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