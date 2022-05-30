Hooks.once('init', async function() {

});

Hooks.once('ready', async function() {
    let document = {};


    pdfjsLib.getDocument('modules/pdfReaderTest/tor_01_livre_de_regles_web_V1.pdf');
    var loadingTask = pdfjsLib.getDocument('modules/pdfReaderTest/tor_01_livre_de_regles_web_V1.pdf');
    loadingTask.promise.then(pdf => {
        // you can now use *pdf* here
        console.log(pdf);
        let maxPage = pdf._pdfInfo.numPages;
        document.pages = new Array(maxPage)

        for (let i = 1; i <= maxPage; i++) {
            pdf.getPage(i).then(function(page) {
                // you can now use *page* here
                page.getTextContent().then(text => {

                    document.pages[i] = text;
                    document.pages[i].textContent = ""
                    for (let item of text.items) {

                        if (item.height < 17 || (item.height > 30 && item.height < 150)) {
                            document.pages[i].textContent += item.str
                        }
                        if (item.width == 0) { document.pages[i].textContent += `
                        
                        ` }
                    }
                })

            });

        }
        console.log(document)
    });

});