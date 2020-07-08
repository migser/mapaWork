global class TelefonicaMapController {

    @AuraEnabled
    global static List<Puesto__c> getPuestos(String queryString){
        
	List<Puesto__c> v1 = [select Id, Name, Location__c , Status__c from Puesto__c ];
        system.debug(v1);
        return v1;
        
    }

    }