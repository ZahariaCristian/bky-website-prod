$(function () {
    var qualeTab = 0;
    var bWizardTabClass = '';
    $('.wizard').each(function () {
        if ($(this).is('#rootwizard'))
            bWizardTabClass = 'bwizard-steps';
        else
            bWizardTabClass = '';

        var wiz = $(this);

        $(this).bootstrapWizard(
		{
		    onNext: function (tab, navigation, index) { validation(tab, navigation, index, wiz); },
		    onLast: function (tab, navigation, index) { validationOnLast(tab, navigation, index, wiz); },
		    onTabClick: function (tab, navigation, index) { validationonTabClick(tab, navigation, index, wiz); },

		    onTabShow: function (tab, navigation, index) { validationonTabShow(tab, navigation, index, wiz); },

		    tabClass: bWizardTabClass,
		    nextSelector: '.next',
		    previousSelector: '.previous',
		    firstSelector: '.first',
		    lastSelector: '.last'
		});

        wiz.find('.finish').click(function () {
            wiz.find("a[data-toggle*='tab']:first").trigger('click');
        });
    });
});

function validation(tab, navigation, index, wiz) {
    switch (index) {
        case 1:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#txtOggettoProgetto').val()) {
                        alert('Devi inserire il Titolo del Progetto');
                        wiz.find('#txtOggettoProgetto').focus();
                        return false;
                    }
                    if (wiz.find('#txtOggettoProgetto').val().length > 250) {
                        alert('Raggiunto massimo numero di caratteri');
                        wiz.find('#txtOggettoProgetto').focus();
                        return false;

                    }

                    break;
                case 2:

                    if (!wiz.find('#labnome_I').val()) {
                        alert('Il nome e la mail sono obbligatori');
                        wiz.find('#labnome_I').focus();
                        return false;
                    }
                    if (!wiz.find('#labmail_I').val()) {
                        alert('Il nome e la mail sono obbligatori');
                        wiz.find('#labmail_I').focus();
                        return false;
                    }
                    break;
                case 3:
                    if (!wiz.find('#txtAziRagioneSociale_I').val()) {
                        alert("La Ragione Sociale e' obbligatoria");
                        wiz.find('#txtAziRagioneSociale_I').focus();
                        return false;
                    }
            }
            break;
        case 2:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#txtDataCnsegnaProgetto_I').val()) {
                        alert('Devi selezionare una data di consegna');
                        wiz.find('#txtDataCnsegnaProgetto_I').focus();
                        return false;
                    }

                    break;
                case 1:

                    if (!wiz.find('#cmbTipologiaModulo_I').val()) {
                        alert('Devi selezionare una tipologia');
                        wiz.find('#cmbTipologiaModulo_I').focus();
                        return false;
                    }

                    break;
                case 2:

                    if (!wiz.find('#cmbAzienda_I').val()) {
                        alert("Il campo Azienda e' obbligatorio");
                        wiz.find('#cmbAzienda_I').focus();
                        return false;
                    }
                    break;
                case 4:

                    if (!wiz.find('#cmbFornitoriPerOrdine_I').val()) {
                        alert('Devi selezionare un fornitore');
                        wiz.find('#cmbFornitoriPerOrdine_I').focus();
                        return false;
                    }

                    break;
            }
            break;
        case 3:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if (!wiz.find('#cmbTagliaModulo_I').val()) {
                        if (!wiz.find('#txtTagliaSpeciale_I').val()) {
                            alert('Devi selezionare una taglia');
                            wiz.find('#cmbTagliaModulo_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
        case 4:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if ($('#cmbstatomodulo_I').val() == "Assegnato al Fornitore") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Assegnato alla Commessa") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Processato") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
    }
}

function validationOnLast(tab, navigation, index, wiz) {
    switch (index) {
        case 1:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#inputTitle').val()) {
                        alert('Devi inserire il codice della commessa');
                        wiz.find('#inputTitle').focus();
                        return false;
                    }

                    break;
                case 1:

                    if (!wiz.find('#cmbModelloModulo_I').val()) {
                        alert('Devi selezionare un modello');
                        wiz.find('#cmbModelloModulo_I').focus();
                        return false;
                    }

                    break;
                case 4:

                    if (!wiz.find('#cmbModuliNonOrdinati_I').val()) {
                        alert('Devi selezionare una matricola');
                        wiz.find('#cmbModuliNonOrdinati_I').focus();
                        return false;
                    }

                    break;
            }
            break;
        case 2:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#ASPxDropDownEdit1_I').val()) {
                        alert('Devi selezionare la tipologia della commessa');
                        wiz.find('#ASPxDropDownEdit1_I').focus();
                        return false;
                    }

                    break;
                case 1:

                    if (!wiz.find('#cmbTipologiaModulo_I').val()) {
                        alert('Devi selezionare una tipologia');
                        wiz.find('#cmbTipologiaModulo_I').focus();
                        return false;
                    }

                    break;
                case 4:

                    if (!wiz.find('#cmbFornitoriPerOrdine_I').val()) {
                        alert('Devi selezionare un fornitore');
                        wiz.find('#cmbFornitoriPerOrdine_I').focus();
                        return false;
                    }

                    break;
            }
            break;
        case 3:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if (!wiz.find('#cmbTagliaModulo_I').val()) {
                        if (!wiz.find('#txtTagliaSpeciale_I').val()) {
                            alert('Devi selezionare una taglia');
                            wiz.find('#cmbTagliaModulo_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
        case 4:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if ($('#cmbstatomodulo_I').val() == "Assegnato al Fornitore") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Assegnato alla Commessa") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Processato") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
    }
}

function validationonTabClick(tab, navigation, index, wiz) {
    switch (index) {
        case 0:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#inputTitle').val()) {
                        alert('Devi inserire il codice della commessa');
                        wiz.find('#inputTitle').focus();
                        return false;
                    }

                    break;
                case 1:

                    if (!wiz.find('#cmbModelloModulo_I').val()) {
                        alert('Devi selezionare un modello');
                        wiz.find('#cmbModelloModulo_I').focus();
                        return false;
                    }

                    break;
                case 4:

                    if (!wiz.find('#cmbModuliNonOrdinati_I').val()) {
                        alert('Devi selezionare una matricola');
                        wiz.find('#cmbModuliNonOrdinati_I').focus();
                        return false;
                    }

                    break;
            }
            break;
        case 1:
            switch (qualeTab) {
                case 0:

                    if (!wiz.find('#ASPxDropDownEdit1_I').val()) {
                        alert('Devi selezionare la tipologia della commessa');
                        wiz.find('#ASPxDropDownEdit1_I').focus();
                        return false;
                    }

                    break;
                case 1:

                    if (!wiz.find('#cmbTipologiaModulo_I').val()) {
                        alert('Devi selezionare una tipologia');
                        wiz.find('#cmbTipologiaModulo_I').focus();
                        return false;
                    }

                    break;
                case 4:

                    if (!wiz.find('#cmbFornitoriPerOrdine_I').val()) {
                        alert('Devi selezionare un fornitore');
                        wiz.find('#cmbFornitoriPerOrdine_I').focus();
                        return false;
                    }

                    break;
            }
            break;
        case 2:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if (!wiz.find('#cmbTagliaModulo_I').val()) {
                        if (!wiz.find('#txtTagliaSpeciale_I').val()) {
                            alert('Devi selezionare una taglia');
                            wiz.find('#cmbTagliaModulo_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
        case 3:
            switch (qualeTab) {
                case 0:

                    break;
                case 1:

                    if ($('#cmbstatomodulo_I').val() == "Assegnato al Fornitore") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Assegnato alla Commessa") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    } else if ($('#cmbstatomodulo_I').val() == "Processato") {
                        if (!wiz.find('#cmbFornitore_I').val()) {
                            alert('Devi selezionare un fornitore');
                            wiz.find('#cmbFornitore_I').focus();
                            return false;
                        }
                        if (!wiz.find('#calDataConsegna_I').val()) {
                            alert('Devi selezionare una data di consegna');
                            wiz.find('#calDataConsegna_I').focus();
                            return false;
                        }
                        if (!wiz.find('#cmbCommessa_I').val()) {
                            alert('Devi selezionare una commessa');
                            wiz.find('#cmbCommessa_I').focus();
                            return false;
                        }
                    }

                    break;
                case 4:

                    break;
            }
            break;
    }
}

function validationonTabShow(tab, navigation, index, wiz) {
    var $total = navigation.find('li:not(.status)').length;
    var $current = index + 1;
    var $percent = ($current / $total) * 100;

    if (wiz.find('.progress-bar').length) {
        wiz.find('.progress-bar').css({ width: $percent + '%' });
        wiz.find('.progress-bar')
            .find('.step-current').html($current)
            .parent().find('.steps-total').html($total)
            .parent().find('.steps-percent').html(Math.round($percent) + "%");
    }

    // update status
    if (wiz.find('.step-current').length) wiz.find('.step-current').html($current);
    if (wiz.find('.steps-total').length) wiz.find('.steps-total').html($total);
    if (wiz.find('.steps-complete').length) wiz.find('.steps-complete').html(($current - 1));

    // mark all previous tabs as complete
    navigation.find('li:not(.status)').removeClass('primary');
    navigation.find('li:not(.status):lt(' + ($current - 1) + ')').addClass('primary');

    // If it's the last tab then hide the last button and show the finish instead
    if ($current >= $total) {
        wiz.find('.pagination .next').hide();
        wiz.find('.pagination .finish').show();
        wiz.find('.pagination .finish').removeClass('disabled');
    } else {
        wiz.find('.pagination .next').show();
        wiz.find('.pagination .finish').hide();
    }
}