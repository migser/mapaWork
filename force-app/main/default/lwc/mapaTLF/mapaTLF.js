import {
    LightningElement,
    api,
    track,
    wire
} from 'lwc';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';
import {
    loadScript,
    loadStyle
} from 'lightning/platformResourceLoader';
import leaflet from '@salesforce/resourceUrl/leaflet_160';
import mapa from '@salesforce/resourceUrl/mapa6';
import markers from '@salesforce/resourceUrl/markers';

import getPuestos from '@salesforce/apex/mapaCtrl.getPuestos';
import updatePuestos from '@salesforce/apex/mapaCtrl.updatePuestos';
import deletePuestos from '@salesforce/apex/mapaCtrl.deletePuestos';
import creaFacility from '@salesforce/apex/mapaCtrl.creaFacility';
import {
    NavigationMixin
} from 'lightning/navigation';

import WORK_DAYS from '@salesforce/schema/wkfsl__Facility_Plan__c.wkfsl__Days_of_the_week__c';

export default class LeafletMap extends NavigationMixin(LightningElement) {
    @api recordId;
    red_icon;
    blue_icon;
    green_icon;
    initiated = false;
    puestos = [];
    nombres = [];
    semana;
    stdate;
    endate;
    mapaJson;
    map;

    iconH = 30;
    iconW = 30;

    objectApiName = 'wkfsl__Facility_Plan__c';
    fields = [WORK_DAYS];

    @track sinPuestos = true;

    @track openmodel = false;


    openmodal() {
        this.openmodel = true
    }
    closeModal() {
        this.openmodel = false
    }

    handleSuccess(fac) {
        this[NavigationMixin.GenerateUrl]({
            type: 'standard__recordPage',
            attributes: {
                recordId: fac.Id,
                actionName: 'view',
            },
        }).then(url => {
            const event = new ShowToastEvent({
                title: 'Facility Plan Creado',
                message: 'Se ha creado el facility plan: {0}. Se han creado los de las areas asociadas y actualizado el del edificio.',
                messageData: [{
                    url,
                    label: fac.Name
                }],
                variant: 'success'
            });
            this.dispatchEvent(event);
        }).catch(error => {
            this.error = error;
            console.log("ERROR en el success --> " + error.message);
        });

    }

    renderedCallback() {

        if (!this.initiated) {
            Promise.all([
                loadScript(this, leaflet + '/leaflet.js'),
                loadStyle(this, leaflet + '/leaflet.css'),
                this.loadGeoJson(),
                getPuestos({ locationId: this.recordId })
            ])
                .then((res) => {
                    res[3].forEach(element => {
                        this.nombres.push(element.Name);
                    });
                })
                .then(() => { this.loadIconos() })
                .then(() => { this.initializeleaflet() })
                .catch(error => {
                    this.error = error;
                    console.log("ERROR  --> " + JSON.stringify(error));
                    this.dispatchEvent(
                        new ShowToastEvent({
                            title: 'Error Iniciando',
                            message: error.message,
                            variant: 'error'
                        })
                    );
                });
        }
    }

    reset() {
        console.log('Haciendo Reset');
        this.puestos.forEach(element => {
            console.log(element.feature.properties.Text);
            element.setIcon(this.blue_icon);
            console.log(element.feature.properties.Text);
        });
        this.puestos = [];
        this.sinPuestos = true;
        deletePuestos
            ({
                locationId: this.recordId
            })
            .then(result => {
                console.log('Puestos borrados');
            })
            .catch(error => {
                this.error = error;
                console.log("ERROR en el deletePuestos --> " + JSON.stringify(error));
            });
    }

    handleSubmit(event) {
        event.preventDefault(); // stop the form from submitting
        let fields = event.detail.fields;
        fields.wkfsl__Service_Territory__c = this.recordId;
        fields.wkfsl__Capacity__c = this.puestos.length;

        console.log(JSON.stringify(fields));
        // this.template.querySelector('lightning-record-form').submit(fields);
        creaFacility({
            stdate: this.stdate,
            endate: this.endate,
            work_days: fields.wkfsl__Days_of_the_week__c,
            loc: fields.wkfsl__Service_Territory__c,
            puestos: this.nombres
        })
            .then(result => {
                console.log('Facility Creado: ' + result.Name);

                this.handleSuccess(result);
            })
            .catch(error => {
                console.log("ERROR");
                this.error = error;
                console.log("ERROR en el creaFacilirt --> " + error);
            });
        this.closeModal();
    }

    salvar() {
        console.log('Guardadndo');
        this.nombres = [];
        this.puestos.forEach(element => {
            this.nombres.push(element.feature.properties.Text);
        });
        updatePuestos({
            puestos: this.nombres,
            locationId: this.recordId
        })
            .then(result => {
                console.log('Puestos salvados: ' + this.nombres.length);
                this.openmodal();
            })
            .catch(error => {
                this.error = error;
                console.log("ERROR en el updatePuestos --> " + JSON.stringify(error));
            });
    }
    calculaSemana(event) {

        var d = new Date(event.target.value);
        var dom = new Date(event.target.value);
        var sab = new Date(event.target.value);

        dom.setDate(d.getDate() - d.getDay());
        sab.setDate(d.getDate() + (6 - d.getDay()));

        this.stdate = dom;
        this.endate = sab;

        console.log(`Fecha: ${d.toString()} Start: ${dom.toString()} End: ${sab.toString()}`);

    }

    handleClick(that, feature, e, layer) {
        console.log(e.target + ' Esta? ' + that.puestos.includes(e.target.feature));

        if (that.puestos.includes(e.target)) {
            console.log('Esta');
            e.target.setIcon(that.blue_icon);
            //e.target.feature.setIcon(that.blue_icon);
            that.puestos.splice(that.puestos.indexOf(e.target), 1);
            that.sinPuestos = (that.puestos.length == 0);

        } else {
            console.log('No Esta');
            e.target.setIcon(that.green_icon);
            that.puestos.push(e.target);
            that.sinPuestos = false;
        }

        console.log('Puestos: ' + that.puestos);



    }

    loadGeoJson() {
        console.log('Cargando mapa');
        return new Promise((resolve, reject) => {
            try {
                let request = new XMLHttpRequest();
                request.open("GET", mapa + '/mapa6.geojson', false);
                request.send(null);
                this.mapaJson = JSON.parse(request.responseText);
                resolve();
            }
            catch (e) {
                reject(e);
            }
        });

    }

    loadIconos() {


        // Iconos

        this.red_icon = L.icon({
            iconUrl: markers + '/marker-red2.png',
            shadowUrl: markers + '/marker-shadow2.png',
            iconSize: [this.iconW, this.iconH],
            shadowSize: [this.iconW, this.iconH],
            iconAnchor: [Math.trunc(this.iconW / 2), this.iconH],
            tooltipAnchor: [0, this.iconH * (-1)]
        });
        this.green_icon = L.icon({
            iconUrl: markers + '/marker-green2.png',
            shadowUrl: markers + '/marker-shadow2.png',
            iconSize: [this.iconW, this.iconH],
            shadowSize: [this.iconW, this.iconH],
            iconAnchor: [Math.trunc(this.iconW / 2), this.iconH],
            tooltipAnchor: [0, this.iconH * (-1)]
        });

        this.purple_icon = L.icon({
            iconUrl: markers + '/marker-purple2.png',
            shadowUrl: markers + '/marker-shadow2.png',
            iconSize: [this.iconW, this.iconH],
            shadowSize: [this.iconW, this.iconH],
            iconAnchor: [Math.trunc(this.iconW / 2), this.iconH],
            tooltipAnchor: [0, this.iconH * (-1)]
        });

        this.blue_icon = L.icon({
            iconUrl: markers + '/marker-blue2.png',
            shadowUrl: markers + '/marker-shadow2.png',
            iconSize: [this.iconW, this.iconH],
            shadowSize: [this.iconW, this.iconH],
            iconAnchor: [Math.trunc(this.iconW / 2), this.iconH],
            tooltipAnchor: [0, this.iconH * (-1)]
        });

        this.no_icon = L.icon({
            iconUrl: markers + '/nomarker.png'

        });
        return new Promise((resolve, reject) => { resolve(); });
    }

    setMap() {
        let that = this;

        L.geoJSON(this.mapaJson, {
            onEachFeature: (feature, layer) => {
                if (feature.properties.Layer == 'NUMERACION') {
                    if (that.nombres.includes(feature.properties.Text)) {
                        that.puestos.push(layer);
                        layer.setIcon(that.green_icon);
                    } else {
                        layer.setIcon(that.blue_icon);
                    }
                    layer.bindTooltip(feature.properties.Text, {
                        direction: 'top'
                    })
                    layer.on({
                        mouseover: (e) => {
                            console.log('Pasando por: ' + feature.properties.Text);
                            e.target.openTooltip();
                        },
                        click: (e) => {
                            console.log('Pinchado en Feature: ' + feature.properties.Text + that.puestos);
                            console.log(e.target);
                            that.handleClick(that, feature, e, layer);

                        }

                    });
                } else if (feature.properties.Layer == 'PL-FURN') {
                    layer.setStyle({
                        color: 'black',
                        weight: 1
                    });
                } else if (feature.properties.Layer == 'GROS$') {
                    layer.setStyle({
                        color: 'red',
                        weight: 4
                    });
                } else if (feature.properties.Layer == '0') {
                    layer.setStyle({
                        color: 'black',
                        weight: 1
                    });

                } else if (feature.properties.Layer == 'SOMBREADO RRHH') {
                    if (feature.properties.EntityHandle == '21E516' || feature.properties.EntityHandle == '21E517') {
                        layer.setStyle({
                            color: 'orange',
                            weight: 3
                        });

                    } else {
                        layer.setStyle({
                            color: 'purple',
                            weight: 3
                        });
                    }
                } else {
                    layer.setStyle({
                        color: 'red',
                        weight: 1
                    });
                }
            }
        }).addTo(this.map);
    }

    initializeleaflet() {

        const mapRoot = this.template.querySelector('.mapa');
        console.log('El componente DIV es: ' + mapRoot);
        this.map = L.map(mapRoot, {
            center: [0, 0],
            zoom: 5
        });
        this.setMap();
        this.initiated = true;
        this.sinPuestos = this.puestos.length == 0;
        console.log('Inicio completo: ' + this.puestos.length + ' ' + this.nombres.length);
        this.nombres = [];


    }
}