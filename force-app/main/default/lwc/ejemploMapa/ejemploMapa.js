import {
    LightningElement,
    track,
    wire
} from 'lwc';
import {
    ShowToastEvent
} from 'lightning/platformShowToastEvent';
import getLocations from '@salesforce/apex/LeafletExample.getLocations';

export default class LeafletExample extends LightningElement {

    @track showMap = false;
    @track locations;
    @track center;

    initiated = false;
    getCurrentLocationOnLoad() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.center = {};
                // set location to center the map like below
                this.center.latitude = position.coords.latitude;
                this.center.longitude = position.coords.longitude;
            });
        } else {
            const evt = new ShowToastEvent({
                title: 'Geolocation is not supported by browser',
                message: 'Check your browser options or use another browser',
                variant: 'error',
            });
            this.dispatchEvent(evt);
        }
    }

    getLocations(center) {
        getLocations({
                centerLat: center.latitude,
                centerLong: center.longitude
            })
            .then(result => {
                this.locations = result;
                console.log('-->locations', this.locations);
                //  this.locations.forEach(location => {
                //    location.content = 'This is ' + location.name + '<br/><di style="text-align:center"><a href="/' + location.locationId + '" target="_blank">View Record</a></div>'
                //});
                console.log('-->locations', this.locations);
                this.showMap = true;
            })
            .catch(error => {
                this.error = error;
                console.log('-->error', this.error);
            });
    }

    renderedCallback() {
        if (!this.initiated) {
            // this.getCurrentLocationOnLoad();

            //set london bridge as center for example
            this.center = {};
            this.center.latitude = 0; //51.507879;
            this.center.longitude = 0; //-0.087732;
            console.log('-->location');
            this.getLocations(this.center);
            this.initiated = true;
        }
    }
}