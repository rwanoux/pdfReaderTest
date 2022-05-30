Hooks.once('init', async function() {

});
let text = ""
Hooks.once('ready', async function() {
    let document = {
        pages: [],
        roughtText: "",
        chapters: [],
        completedPages: 0
    };
    /*
    let headersHeight = {
        "h1": 16,
        "h2":
    }
    */
    async function extractText() {

        let extractedText = ""
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
                        document.pages[i].textContent = "";
                        for (let item of text.items) {
                            if (!document.pages[i].textContent.endsWith(item.str) && item.width > 0.2) { //eviter les doublons des ombres et éviter les espaces vides

                                if (!document.pages[i].textContent.endsWith(" ") && item.str[0] != " ") {
                                    document.pages[i].textContent += (" " + item.str)
                                } else {
                                    document.pages[i].textContent += item.str;

                                }
                                document.pages[i].textContent = document.pages[i].textContent.replace("�", ".")
                            }
                        }

                        if (i == 58) {
                            console.log(document.pages[i].textContent, document.pages[i])
                            let testMessage = {
                                user: game.user.data._id,
                                speaker: ChatMessage.getSpeaker(),
                                content: document.pages[i].textContent
                            };
                            ChatMessage.create(testMessage);
                        }
                        /*
                        completDocument(document.pages[i].textContent)
                        */

                        if (checkComplete(document, maxPage)) {
                            createText(document)
                        }


                    })


                });

            }



        });

    }

    function checkComplete(document, maxPage) {
        document.completedPages++;
        if (document.completedPages < maxPage) {
            return false
        } else return true
    }

    function createText(document) {
        console.log(document)
        for (let page of document.pages) {
            console.log(page)
            if (page) {
                document.roughtText += page.textContent

            }

        }
        console.log(document.roughtText)
        let d = new Dialog({
            title: "Welcome to the Official Torg Eternity System for Foundry VTT!",
            content: document.roughtText,
            buttons: {
                one: {
                    icon: '<i class="fas fa-check"></i>',
                    label: `${game.i18n.localize("torgeternity.submit.OK")}`,
                }
            }

        }, {
            left: 100,
            top: 100,
            resizable: true
        });
        d.render(true);
    }

    function completDocument(str) {
        document.roughtText += str
    }
    await extractText();



});