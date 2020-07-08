import {
    LightningElement,
    api,
    track,
    wire
} from 'lwc';

import {
    loadScript,
    loadStyle
} from 'lightning/platformResourceLoader';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';

import leaflet from '@salesforce/resourceUrl/leaflet_160';
import mapa from '@salesforce/resourceUrl/mapa6';
import markers from '@salesforce/resourceUrl/markers';

import getEmpId from '@salesforce/apex/mapaCtrl.getEmployee';
import getPuestos from '@salesforce/apex/mapaCtrl.getPuestos';
import reservaPuesto from '@salesforce/apex/mapaCtrl.reservaPuesto';

export default class LeafletMap extends LightningElement {
    @api recordId;

    red_icon;
    blue_icon;
    green_icon;
    purple_icon;
    initiated = false;
    puesto;
    nombres = [];
    iconH = 41;
    iconW = 41;
    employeeId;
    mapaJson;
    map;
    no_icon;

    renderedCallback() {

        console.log(this.recordId);
        if (!this.initiated) {
            Promise.all([
                loadScript(this, leaflet + '/leaflet.js'),
                loadStyle(this, leaflet + '/leaflet.css'),
                this.loadGeoJson(),
                getEmpId(),
                getPuestos({ locationId: this.recordId })
            ])
                .then((res) => {
                    console.log('Vamos');
                    this.employeeId = res[3];
                    console.log(this.employeeId);
                    res[4].forEach(element => {
                        this.nombres.push({
                            Name: element.Name,
                            Status: element.Status__c,
                            Empleado: element.Empleado__c
                        });
                    })

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
    loadGeoJson() {

        return new Promise((resolve, reject) => {
            try {
                let request = new XMLHttpRequest();
                request.open("GET", mapa + '/mapa6.geojson', false);
                request.send(null);
                this.mapaJson = JSON.parse(request.responseText);
                console.log('Cargando mapa');
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
        console.log('Iconos');
        return new Promise((resolve, reject) => { resolve(); });
    }
    handleClick(that, feature, e, layer) {
        console.log(e.target.feature.properties.Text);
        var puesto = that.nombres.filter(puesto => puesto.Name === e.target.feature.properties.Text);
        if (puesto[0].Status == 'Libre') {
            if (that.puesto) {
                that.puesto.setIcon(that.green_icon);
                //poner como libre este puesto en nombres
            }
            e.target.setIcon(that.purple_icon);
            that.puesto = e.target;
            reservaPuesto({
                puesto: e.target.feature.properties.Text,
                locationId: that.recordId
            })
                .then(result => {
                    console.log('Puesto reservado: ' + e.target.feature.properties.Text);
                    const event = new ShowToastEvent({
                        title: 'Puesto Reservado!',
                        message: 'Se ha reservado para ti el puesto: {0}',
                        messageData: [e.target.feature.properties.Text],
                        variant: 'success'
                    });
                    this.dispatchEvent(event);
                })
                .catch(error => {
                    this.error = error;
                    console.log("ERROR en el reserva puesto --> " + error.message);
                });
        } else if (puesto[0].Status != 'Libre' && puesto[0].Empleado == that.employeeId) {
            e.target.setIcon(that.green_icon);
            console.log('liberando puesto');
            //poner como libre este puesto en nombres
            that.puesto = null;
        }
    }
    calculaSemana() {
        console.log('Semana: ' + this.semana);
    }
    filtro(feature) {
        if ((feature.properties.Layer == 'NUMERACION') && (this.nombres.filter(puesto => puesto.Name === feature.properties.Text).length == 0))
            return false;
        else return true;
    }

    setMap() {
        let that = this;

        L.geoJSON(this.mapaJson, {
            onEachFeature: (feature, layer) => {
                if (feature.properties.Layer == 'NUMERACION') {
                    var puesto = that.nombres.filter(puesto => puesto.Name === feature.properties.Text);
                    if (puesto.length == 1) {
                        if (puesto[0].Status == 'Libre') {
                            layer.setIcon(that.green_icon);
                            layer.Estado = 'Libre';
                        } else {

                            if (puesto[0].Empleado === that.employeeId) {
                                layer.setIcon(that.purple_icon);
                                that.puesto = layer;
                            } else {
                                layer.setIcon(that.red_icon);
                            }

                        }
                        layer.bindTooltip(feature.properties.Text, {
                            direction: 'top'
                        });
                        layer.on({
                            mouseover: (e) => {
                                console.log('Pasando por: ' + feature.properties.Text);
                                e.target.openTooltip();
                            },
                            click: (e) => {
                                that.handleClick(that, feature, e, layer);
                            }
                        });
                    } else {
                        layer.setIcon(that.no_icon);
                    }
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
        }, {
            filter: (feature) => {
                console.log('Filtrando');
                console.log(feature.properties.Text + ' ' + that.nombres);
                if ((feature.properties.Layer == 'NUMERACION') && (that.nombres.filter(puesto => puesto.Name === feature.properties.Text).length == 0)) {
                    return false;
                } else return true;
            }
        }).addTo(this.map);
    }

    refreshMap() {
        console.log('Refrescando');
        this.map.removeLayer(L.geoJson);
        this.nombres = [];

        getPuestos({ locationId: this.recordId })
            .then((res) => {
                res.forEach(element => {
                    this.nombres.push({
                        Name: element.Name,
                        Status: element.Status__c,
                        Empleado: element.Empleado__c
                    });
                });
                console.log('Nuevos puestos: ' + this.nombres);
                this.setMap();
            })
            .catch(error => {
                this.error = error;
                console.log("ERROR refresncando --> " + JSON.stringify(error));
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Error Refrescando',
                        message: error.message,
                        variant: 'error'
                    })
                );
            });
    }

    initializeleaflet() {


        console.log('Inicia');
        const mapRoot = this.template.querySelector('.mapa');
        console.log('El componente DIV es: ' + mapRoot);
        this.map = L.map(mapRoot, {
            center: [0, 0],
            zoom: 5,
            tap: false
        });

        this.setMap();

        this.initiated = true;




    }
}