public with sharing class mapaCtrl {

    @AuraEnabled
    public static List<Puesto__c> getPuestos(String locationId) {

        return [select Id, Name, Location__c , Status__c, Empleado__c from Puesto__c where Location__c = :locationId];

    }
    @AuraEnabled
    public static String updatePuestos(List<String> puestos, String locationId) {
             deletePuestos(locationId);
             System.debug('Actualizando');
             List<Puesto__c> new_ps = new List<Puesto__c>();
             Integer i = 0;
             for (String n : puestos) {

                String estado='Libre';
                if (((i==1)||(Math.Random()>0.5))&&(n!='A12')&&(n!='A15')) {
                    estado ='Ocupado';
                    i=i+1;
                } else {
                i=i+1;
                }
                
                Puesto__c p = new Puesto__c (Name =n, Location__c= locationId, Status__c = estado);
                new_ps.add(p);
             } 
             insert new_ps;

         System.debug('Puestos: '+ puestos+' Loc: '+locationId);
         return 'OK';
    }
    public static Map<String,Integer> getAreas (List<String> puestos) {
        Map<String,Integer> resultado = new Map<String,Integer>();
        for (String p : puestos) {
            Integer num = resultado.get(p.substring(0,1));
            if (num==null) 
                resultado.put(p.substring(0,1),1);
            else 
                resultado.put(p.substring(0,1),num+1);
        }
        return resultado;
    }

    public static wkfsl__Facility_Plan__c generaFPArea (String stId, Integer max, Integer occupancy,Date stdate ,  Date endate, String work_days  ) {
        Integer real_o;
        if (occupancy==null) 
            real_o =0;
            else real_o=occupancy;
        wkfsl__Facility_Plan__c fac = new wkfsl__Facility_Plan__c(wkfsl__Start_Date__c= stdate, wkfsl__End_Date__c= endate, 
        wkfsl__Days_of_the_week__c= work_days, wkfsl__Service_Territory__c = stId, wkfsl__Capacity__c=real_o, wkfsl__Percentage_Allocation__c = 100*real_o/max);
        return fac;
    } 

    public static void generaFPEdificio (String stId, Integer occupancy,Date stdate ,  Date endate, String work_days) {
        ServiceTerritory st = [select id, name, wkfsl__Maximum_Occupancy__c from ServiceTerritory where id = :stId ];
        List<wkfsl__Facility_Plan__c> fs= [select id,wkfsl__Start_Date__c,wkfsl__Capacity__c ,wkfsl__Percentage_Allocation__c
                                        from wkfsl__Facility_Plan__c
                                        where wkfsl__Start_Date__c= :stdate and  wkfsl__Service_Territory__c= :stId
                                        order by createddate desc];
        if (fs.size()>0) {
            wkfsl__Facility_Plan__c upd_fs = fs[0];
            upd_fs.wkfsl__Capacity__c= upd_fs.wkfsl__Capacity__c+ occupancy;
            upd_fs.wkfsl__Percentage_Allocation__c = 100*(Integer)upd_fs.wkfsl__Capacity__c/(Integer)st.wkfsl__Maximum_Occupancy__c;
            update upd_fs;
        } else {
            wkfsl__Facility_Plan__c new_fs = new wkfsl__Facility_Plan__c(wkfsl__Start_Date__c= stdate, wkfsl__End_Date__c= endate, 
        wkfsl__Days_of_the_week__c= work_days, wkfsl__Service_Territory__c = stId, 
        wkfsl__Capacity__c=occupancy, wkfsl__Percentage_Allocation__c = 100*occupancy/(Integer)st.wkfsl__Maximum_Occupancy__c);
        insert new_fs;
        }
    }
    @AuraEnabled
    public static wkfsl__Facility_Plan__c creaFacility(Date stdate ,  Date endate, String work_days, String loc, List<String> puestos ) {


        System.debug('Los puestos son: '+puestos);

        List<ServiceTerritory> st = [select id, ParentTerritoryId,  name, wkfsl__Maximum_Occupancy__c from ServiceTerritory where wkfsl__Location__c = :loc];
        String stId;

        Integer capacity = puestos.size();
        Integer max;

        if (st.size()>0) {
            stId=st[0].id;
            max = (Integer)st[0].wkfsl__Maximum_Occupancy__c;
        

        wkfsl__Facility_Plan__c fac = new wkfsl__Facility_Plan__c(wkfsl__Start_Date__c= stdate, wkfsl__End_Date__c= endate, wkfsl__Generate_Shift__c=true,
        wkfsl__Days_of_the_week__c= work_days, wkfsl__Service_Territory__c = stId, wkfsl__Capacity__c=capacity, wkfsl__Percentage_Allocation__c = 100*capacity/max
        );
       

        // 1. Crear Facility Plan Areas

        List<ServiceTerritory> st_areas = [select id, name, wkfsl__Maximum_Occupancy__c from ServiceTerritory where ParentTerritoryId = :stId];

        List<wkfsl__Facility_Plan__c> fac_areas = new List<wkfsl__Facility_Plan__c>();
        
        fac_areas.add(fac);

        Map<String,Integer> areas = getAreas(puestos);

        for (ServiceTerritory sterritory : st_areas){
            wkfsl__Facility_Plan__c fac_area = generaFPArea(sterritory.id,(Integer) sterritory.wkfsl__Maximum_Occupancy__c, 
                                    areas.get(sterritory.Name.substringAfterLast('-').trim()),stdate,endate,work_days);
            fac_areas.add(fac_area);
        } 

        insert fac_areas;

        // 2. Crear Facility Plan Padre
        
        generaFPEdificio(st[0].ParentTerritoryId,capacity,stdate,endate,work_days);

        
        wkfsl__Facility_Plan__c res = [select id, name from wkfsl__Facility_Plan__c where id =:fac.id]; 
        System.debug('Fac: '+res.Name);
        return res;
    } else return null;
        
    }
    @AuraEnabled
    public static String getEmployee() {

        String x = UserInfo.getUserId();
        User u =[select employeenumber from user where id = :x]; 
        List<Employee> e = [select id from employee where employeenumber = :u.employeenumber];
        if (e.size()>0) {
            System.debug('Employee encontrado '+e[0].id);
            return e[0].id;
        } else {
            System.debug('Employee no encontrado');
            return null;
        }
    }
    @AuraEnabled
    public static String reservaPuesto(String puesto, String locationId) {
        String em = getEmployee();
        List<Puesto__c> ps_old= [select id, Status__c, Location__c,Empleado__c 
                                from Puesto__c 
                                where Location__c = :locationId and Empleado__c= :em];
        List<Puesto__c> ps_new= [select id, Status__c, Location__c,Empleado__c 
                                from Puesto__c 
                                where Location__c = :locationId and Name= :puesto];
        if (ps_new.size()>0){
            Puesto__c p = ps_new[0];
            if (p.Status__c == 'Libre') {
                p.Status__c = 'Ocupado';
                p.Empleado__c=em;
                if (ps_old.size()>0){
                    Puesto__c p_old = ps_old[0];
                    p_old.Empleado__c = null;
                    p_old.Status__c = 'Libre';
                    ps_new.add(p_old);
                }
                update ps_new;
            }
        } 
        return 'OK';
    }

    @AuraEnabled
    public static String deletePuestos(String locationId) {
        System.debug('Borrando');
        List<Puesto__c> lp = [select id from Puesto__c where Location__c=:locationId];
        delete lp;
        return 'OK';
    }
}
