public with sharing class LeafletExample {
    @AuraEnabled(cacheable=true)
    public static List<Location> getLocations(Double centerLat, Double centerLong) {
        List<Location> locations = new List<Location>();

        //run a query to get nearby locations from a current
        //location sent

        //add southwark location
        System.debug('El getLocations');
        Location loc1 = new Location();
        loc1.name = 'Southwark Bridge';
        loc1.latitude = 51.5089;
        loc1.longitude = -0.0940;
        loc1.locationId = '0019000000GrhrdAAB'; //locationId to open record
        locations.add(loc1);

        Location loc2 = new Location();
        loc2.name = 'London Bridge';
        loc2.latitude = 51.507879;
        loc2.longitude = -0.087732;
        loc2.locationId = '0019000000GrhrdAAB'; //locationId to open record
        locations.add(loc2);


        Location loc3 = new Location();
        loc3.name = 'Monument';
        loc3.latitude = 51.5101;
        loc3.longitude = -0.0859;
        loc3.locationId = '0019000000GrhrdAAB'; //locationId to open record
        locations.add(loc3);

        System.debug('locations' + locations);
        
        return locations;
    }


    public class Location{
        @AuraEnabled public String name;
        @AuraEnabled public Double latitude;
        @AuraEnabled public Double longitude;
        @AuraEnabled public Id locationId;
    }
}