import numpy as np
import matplotlib.pyplot as plt
from netCDF4 import Dataset
import datetime as dt
import os
import matplotlib.dates as mdates   
import matplotlib as mpl
import numpy.ma as ma
import math
import matplotlib.ticker as ticker


def main():
    #print "Auto process Lidar data at ", dt.datetime.now()
    s0 = dt.datetime.now(); print "start at :", s0

    #Site                    =['EPA-NCU','Douliu','Xitun','Kaohsiung']
    Site                    =['Guanyin']
    st='202604120000'
    end='20260412000'   
    t1_date= dt.datetime.strptime(st,"%Y%m%d%H%M")
    t2_date = dt.datetime.strptime(end,"%Y%m%d%H%M")
    header_dic={'EPA-NCU':'437','Kaohsiung':'437','Douliu':'437','Chiayi':'438','Banqiao':'438','Xitun':'438','MPL44250-NCU-LAB':'438','MPL44249-NCU-LAB':'438','MPL44244-NCU-LAB':'437','MPL44264-NCU-LAB':'438','MPL44265-NCU-LAB':'438','MPL44266-NCU-LAB':'438','MMPL5009-NCU-LAB':'400','Guanyin':'400'}
    for i_site in Site:
        L1_data_path            = 'C:/Stefani_home/Data/Lidar/'+i_site+'/L1/'            
        L1_data_path            = 'Z:/Data/Instrument/MPL/'+i_site+'/L1/'        
        all_time1,all_time, all_data, all_data_cr, header,all_data_eng,all_data_bt,all_data_Lt,all_data_dt,all_data_bk=read_L1(L1_data_path,t1_date,t2_date,i_site,header_dic)
        depo_ratio=all_data_cr/(all_data+all_data_cr) #NRB_cr/(NRB_co+NRB_cr)  s
        plot_date = t2_date + dt.timedelta(days=1)
        start,stop = set_range(all_time,t1_date,plot_date)
        data_time = all_time[start:stop]# 
        data_pick = np.transpose(all_data[start:stop])
        data_pick_depo_ratio=np.transpose(depo_ratio[start:stop])

        height_range = np.ma.array(header, mask=( (header <=30) ) )
        height_range.mask=~height_range.mask
        (bot,top) = np.ma.flatnotmasked_edges(height_range)    
        data_pick = data_pick[:top+2]; header = header[:top+2]
        data_pick_depo_ratio = data_pick_depo_ratio[bot:top+2]; 
        data_pick_depo_ratio[0]=0.00000000001
        start,stop = set_range(all_time1,t1_date,plot_date)
        data_time1=all_time1[start:stop]
        data_eng_pick=all_data_eng[start:stop]
        data_bt_pick=all_data_bt[start:stop]
        data_Lt_pick=all_data_Lt[start:stop]
        data_dt_pick=all_data_dt[start:stop]
        data_bk_pick=all_data_bk[start:stop]
        #print'in main PM25_time',PM25_time

        if start and stop :
            output_jpg(data_time1,data_time,data_pick,data_pick_depo_ratio,data_eng_pick,data_bt_pick,data_Lt_pick,data_dt_pick,data_bk_pick,header,i_site,t1_date,t2_date,plot_date)
        else:
            print'start and stop',start ,stop
        
        s1 = dt.datetime.now();  print "start at :", s0;     print "end at :", s1


def read_L1(L1_data_path,t1,t2,i_site,header_dic):
    pre_date=(t2-t1).days+2
    t0 = t1 -dt.timedelta(days=1)
    date_list =[t0 +x*dt.timedelta(days=1) for x in range(0,pre_date,1)]
    #print'date_list',date_list
    all_time=[]
    all_data=[]
    all_data_cr=[]
    all_data_eng=[]
    all_data_bt=[]
    all_data_Lt=[]
    all_data_dt=[]
    all_data_bk=[]

    #days='1440'
    for i, item  in enumerate(date_list): 
        date_i = dt.datetime.strftime(item, '%Y%m%d')
        print'date_i',date_i
        print'L1_data_path',L1_data_path,L1_data_path+date_i[0:4]+'/'
        new_num_days=(dt.date(int(date_i[0:4]), int(date_i[4:6]), int(date_i[6:8])) - dt.date(int(date_i[0:4]), 1, 1)).days+1    
        days=np.arange(new_num_days, new_num_days+1, 1/1440.)
        pre_date=np.append(pre_date,date_i)
        L1_files = [x for x in os.listdir(L1_data_path+date_i[0:4]+'/') if x.endswith(date_i+'.nc')]
        if (len(L1_files) > 0):
            print'L1_files',L1_files
            
            nc = Dataset(L1_data_path+date_i[0:4]+'/'+L1_files[0])
            header = np.zeros(nc.variables["range"].shape); 
            #print'header size',np.shape(header)
            header[:] = nc.variables["range"][:]   
            time_0  = np.zeros(len(nc.variables['Time']))           
            time_0[:] = nc.variables['Time'][:]
            #print'time size',np.shape(time_0)        
            data_time = np.array([ matlab_dt(time_x,item)+ dt.timedelta(hours=8) for time_x in time_0]) #for Taiwan Local time
            data=np.zeros(nc.variables['NRB_Co'].shape)
            data[:]=nc.variables['NRB_Co'][:]
            data_nrb_cr=np.zeros(nc.variables['NRB_Cr'].shape)
            data_nrb_cr[:]=nc.variables['NRB_Cr'][:]
            data_Eng=np.zeros(nc.variables['Energy'].shape)
            data_Eng[:]=nc.variables['Energy'][:]
            data_BT=np.zeros(nc.variables['Box_Temp'].shape)
            data_BT[:]=nc.variables['Box_Temp'][:]
            data_DT=np.zeros(nc.variables['Det_Temp'].shape)
            data_DT[:]=nc.variables['Det_Temp'][:]
            print'data_DT',data_DT
            data_LT=np.zeros(nc.variables['Las_Temp'].shape)
            data_LT[:]=nc.variables['Las_Temp'][:]
            data_BK=np.zeros(nc.variables['Backgrd_Avg'].shape)
            data_BK[:]=nc.variables['Backgrd_Avg'][:]
            nc.close()

        else:
            #header = np.empty(np.size(int(header_dic[i_site])))
            time_0  = np.zeros(len(days))
            time_0[:] = days
            data_time = np.array([ matlab_dt(time_x,item)+ dt.timedelta(hours=8) for time_x in time_0]) #for Taiwan Local time
            data=np.empty((np.size(days),int(header_dic[i_site])))
            #data=np.nan
            data_nrb_cr=np.empty((np.size(days),int(header_dic[i_site])))
            #data_nrb_cr=np.nan 
            data_Eng = np.empty(np.size(days))
            data_BT = np.empty(np.size(days))
            data_BT = np.empty(np.size(days))
            data_DT = np.empty(np.size(days))
            data_BT = np.empty(np.size(days))
            data_LT = np.empty(np.size(days))
            data_BK = np.empty(np.size(days))
            header = np.zeros(int(header_dic[i_site]))
            print'header',np.shape(header)

            header_tmp=np.arange(0,0.03*int(header_dic[i_site])+2,0.03)+0.015
            print'header_tmp',np.shape(header_tmp)
            header[:] = np.transpose(header_tmp[0:int(header_dic[i_site])])
            data[:]= np.NAN
            data_nrb_cr[:] = np.NAN
            data_Eng[:] = np.NAN
            data_BT[:] = np.NAN
            data_BT[:] = np.NAN
            data_DT[:] = np.NAN
            data_BT[:] = np.NAN
            data_LT[:] = np.NAN
            data_BK[:] = np.NAN
            print'in no nc np.shape(data)',np.shape(data)            
        all_time = np.append(all_time,data_time)
        all_data_eng = np.append(all_data_eng,data_Eng)
        all_data_bt = np.append(all_data_bt,data_BT)
        all_data_Lt = np.append(all_data_Lt,data_LT)
        all_data_dt = np.append(all_data_dt,data_DT)
        all_data_bk = np.append(all_data_bk,data_BK)

        if (i == 0 ):
            all_data = data
            all_data_cr = data_nrb_cr
        else:
            all_data=np.vstack((all_data,data))
            all_data_cr=np.vstack((all_data_cr,data_nrb_cr))
    #gap=30
    #return all_time,all_time[::gap], all_data[::gap], all_data_cr[::gap], header,all_data_eng,all_data_bt,all_data_Lt,all_data_dt,all_data_bk
    return all_time,all_time, all_data, all_data_cr, header,all_data_eng,all_data_bt,all_data_Lt,all_data_dt,all_data_bk


def matlab_dt_epa(matlab_datenum,date_x):
#in this case the time format is Julian day
    try:
        day = dt.timedelta(days=(int(matlab_datenum)-367))+ dt.datetime(1, 1, 1)    
    except:
        print matlab_datenum
    ftime = dt.timedelta(days=matlab_datenum%1)
    if ftime.microseconds > 5*10**5:
        ftime = ftime + dt.timedelta(microseconds=1*10**6) - dt.timedelta(microseconds = ftime.microseconds)
    elif 0 < ftime.microseconds < 5*10**5:
        ftime = ftime - dt.timedelta(microseconds = ftime.microseconds)
    return day + ftime


def matlab_dt(matlab_datenum,date_x):
#in this case the time format is Julian day
    try:
        #day = dt.timedelta(days=(int(matlab_datenum)-1))+ dt.datetime(date_x.year, date_x.month, 1)
        day = dt.timedelta(days=(int(matlab_datenum)-1))+ dt.datetime(date_x.year,1, 1)
        #print'day',day
    except:
        print matlab_datenum
    ftime = dt.timedelta(days=matlab_datenum%1)
    if ftime.microseconds > 5*10**5:
        ftime = ftime + dt.timedelta(microseconds=1*10**6) - dt.timedelta(microseconds = ftime.microseconds)
    elif 0 < ftime.microseconds < 5*10**5:
        ftime = ftime - dt.timedelta(microseconds = ftime.microseconds)
    #print'ftime',ftime
    return day + ftime


def set_range(data_time,plot_time_st,plot_time_end):  
    #print'plot_time_end',plot_time_end
    #print'data_time',data_time
    timerange = np.ma.array(data_time, mask=((data_time >= plot_time_st) == (data_time < plot_time_end) ) )   
    timerange.mask=~timerange.mask
    try:
        (start, stop) = np.ma.flatnotmasked_edges(timerange)
    except TypeError:   
        (start, stop) = (False,False)
        pass
    return start, stop


def output_jpg(data_time1,data_time,data_pick,data_pick_depo_ratio,data_eng_pick,data_bt_pick,data_Lt_pick,data_dt_pick,data_bk_pick,header,i_site,t1_date,t2_date,plot_date):
    process_days=(t2_date-t1_date).days
    fig = plt.figure(figsize=(8, 8))
    tick_hr=60*24
    titlesize=14
    ticksize=10
    labelsize=10
    months = mdates.MonthLocator()
    #days = mdates.DayLocator(bymonthday=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31])
    days = mdates.DayLocator(interval = 2)
    #days = mdates.DayLocator(bymonthday=[1,11,21,31,11,21,31])
    each_days = mdates.DayLocator()
    dfmt = mdates.DateFormatter('%m/%d')
    hours = mdates.HourLocator(byhour=[4,8,12,16,20])
    #hours = mdates.HourLocator(byhour=[2,4,6,8,10,12,14,16,18,20,22])
    xminorFormatter=mdates.DateFormatter('%H')
    nrb_min=0.0; nrb_max=20
    if (i_site == 'MPL44244-NCU-LAB'):
        nrb_min=0.0; nrb_max=2.0
    if (i_site == 'MMPL5009-NCU-LAB'):
        nrb_min=0.0; nrb_max=4.0
    if (i_site == 'Guanyin'):
        nrb_min=0.0; nrb_max=2.0
    if (i_site == 'Douliu'):
        nrb_min=0.0; nrb_max=10.0    
    if (i_site == 'EPA-NCU'):
        nrb_min=0.0; nrb_max=10.0    
    levels_0 = np.linspace(nrb_min, nrb_max, 101)
    cdict_pcolor = {
        'red'  :  ( (0.0, 0., 0.0),(0.015, 0.0, 0.0),(0.125, 0., 0.),(0.375, 0., 0.),(0.625, 1., 1.),(0.875, 1., 1.),(1., 1., 1.)),
        'green':  ( (0.0, 0., 0.0),(0.015, 0.0, 0.0),(0.125, 0., 0.),(0.375, 1., 1.),(0.625, 1., 1.),(0.875, 0., 0.),(1., 1., 1.)),
        'blue' :  ( (0.0, 0., 0.0),(0.015, 0.0, 0.6),(0.125, 1., 1.),(0.375, 1., 1.),(0.625, 0., 0.),(0.875, 0., 0.),(1., 1., 1.))}
    cm_myjet = mpl.colors.LinearSegmentedColormap('my_jet', cdict_pcolor, 101) 

    ax4 = fig.add_subplot(414)   
    #ax4.set_ylim(np.nanmean(data_eng_pick)-0.05,np.nanmean(data_eng_pick)+0.05)
    #ax1.set_yticks([5.4,5.8,6.2,6.6,7.0,7.4])
    ax4.set_ylabel("Energy")
    mask = np.isfinite(data_bk_pick)

    ax4.plot(data_time1[mask], np.log10(data_bk_pick)[mask], 'b-')
    ax4.plot([data_time1[0],data_time1[-1]], [np.log10(10),np.log10(10)], 'r--',alpha=0.5,linewidth=0.5  )
    ax4.set_ylabel("Background")
    #ax4.set_ylim(-3.4,2.1)
    ax4.set_yticks([np.log10(0.001),np.log10(0.01),np.log10(0.1),np.log10(1),np.log10(10),np.log10(100)])
    newlabels=['0.001','0.01','0.1',' 1','10','100']
    ax4.set_yticklabels(newlabels)

    ax8= ax4.twinx() 
    #fig.subplots_adjust(right=0.75)
    #ax7.spines['right'].set_position(('axes', 1.2))
    ax8.set_frame_on(True)
    ax8.patch.set_visible(False)
    mask = np.isfinite(data_eng_pick)

    ax8.plot(data_time1[mask], data_eng_pick[mask], 'g-')
    ax8.set_xlim(t1_date,data_time1[-1])

    ax8.tick_params(axis="y", labelcolor="green",direction='out', length=4, width=1, colors='green')
    ax8.spines['right'].set_color('green')

    ax8.set_ylabel("Energy",color='green')
    ax8.xaxis.set_major_locator(days)
    ax8.xaxis.set_major_formatter(dfmt)
    ax8.set_xlabel("Time (LT)")
    

    ax5 =  fig.add_subplot(413)     
    mask = np.isfinite(data_Lt_pick)
    ax5.plot(data_time1[mask], data_Lt_pick[mask], color = 'green',linestyle='-',label='laser:%.1f - %.1f $^\circ$C'%(np.nanmin(data_Lt_pick),np.nanmax(data_Lt_pick)))
    mask = np.isfinite(data_dt_pick)
    ax5.plot(data_time1[mask], data_dt_pick[mask], color = 'blue',linestyle='-',label='detector:%.1f - %.1f $^\circ$C'%(np.nanmin(data_dt_pick),np.nanmax(data_dt_pick)))
    mask = np.isfinite(data_bt_pick)
    ax5.plot(data_time1[mask], data_bt_pick[mask], 'r-',label='box: %.1f - %.1f $^\circ$C'%(np.nanmin(data_bt_pick),np.nanmax(data_bt_pick)))
    ax5.plot([data_time1[0],data_time1[-1]], [26.,26.], 'k--',alpha=0.5,linewidth=0.5  )

    ax5.set_ylabel("Temperature")
    ax5.set_xlim(t1_date,data_time1[-1])
    
    ax5.yaxis.set_ticks(np.arange(18, 36.0, 4.0))
    leg5=ax5.legend(loc='lower center',ncol=3,fontsize=7)
    leg5.draw_frame(False)    #ax2.set_yticks([18,22,26,30])
    ax5.xaxis.set_major_locator(days)
    ax5.xaxis.set_major_formatter(dfmt)
    ax5.axes.xaxis.set_ticklabels([])
    alts=[1]
    alt=1
    ax1 = fig.add_subplot(411) 
    t1=dt.datetime.strftime(t1_date, '%Y%m%d')
    t2=dt.datetime.strftime(t2_date, '%Y%m%d')
    ax1.set_title(i_site+' site NRB, Level 1 Date= '+t1+' - '+t2 ,fontsize=titlesize)
    #print'np.shape(data_pick)',np.shape(data_pick)
    x = mdates.date2num(data_time)
    #print'np.shape(header)',np.shape(header)
    tm = plt.pcolor(x, header, data_pick,vmin=nrb_min, vmax=nrb_max, cmap=cm_myjet)#plt.cm.jet
    ax1.yaxis.grid(color='gray', alpha=0.5, linestyle='solid', linewidth=0.5)
    #ax1.set_ylim([0,alt])

    plt.ylabel('Height (km)',fontsize=labelsize) 
    ax1.xaxis.set_major_locator(days)
    ax1.xaxis.set_major_formatter(dfmt)
    #ax1.xaxis.set_minor_locator(each_days)
    ax1.xaxis.set_minor_locator(hours)

#    if (process_days  <= 3):
#        ax1.xaxis.set_minor_locator(hours)
#        ax1.xaxis.set_minor_formatter( xminorFormatter )
#    else:
#        hours = mdates.HourLocator(byhour=[8,16])
#        ax1.xaxis.set_minor_locator(hours)
#        ax1.xaxis.set_minor_formatter( xminorFormatter )
 
    #ax4.xaxis.set_minor_locator(each_days)
    #ax1.set_xlim(t1_date,t2_date)
    ax1.set_xlim(t1_date,data_time[-1])
    ax1.axes.xaxis.set_ticklabels([])

    plt.xticks(rotation=0,fontsize=ticksize)
    cax = fig.add_axes([0.91, 0.715, 0.015, 0.17])
    #plt.colorbar(cax=cax,ticks=[0,4,8,12,16,20]).set_label(label=u'(MHz km$\mathregular{^2}$ $\mathregular{\mu}$$\mathregular{J^{-1}}$)', rotation=270,labelpad=15,fontsize=labelsize)
    plt.colorbar(cax=cax,ticks=[0,4,8,12,16,20]).set_label(label='NRB signal', rotation=90,labelpad=10,fontsize=labelsize)
    if (i_site == 'Douliu'):
            #plt.colorbar(cax=cax,ticks=[0,0.2,0.4,0.6,0.8,1]).set_label(label='L1 NRB', rotation=270,labelpad=10,fontsize=labelsize)
            #plt.colorbar(cax=cax,ticks=[0,0.4,0.8,1.2,1.6,2]).set_label(label='L1 NRB', rotation=270,labelpad=10,fontsize=labelsize)
       plt.colorbar(cax=cax,ticks=[0,2,4,6,8,10]).set_label(label='NRB signal', rotation=90,labelpad=10,fontsize=labelsize)
    if (i_site == 'Guanyin'):
           plt.colorbar(cax=cax,ticks=[0,0.4,0.8,1.2,1.6,2]).set_label(label='L1 NRB', rotation=270,labelpad=10,fontsize=labelsize)

    cax.tick_params(labelsize=ticksize)    

    ax2 = fig.add_subplot(412)    
    nrb_min=np.log10(0.0001); nrb_max=np.log10(0.11)
    #nrb_min=-2.5; nrb_max=-0.9
    levels_0 = np.linspace(nrb_min, nrb_max, 101)
    cdict_pcolor = {
        'red'  :  ( (0.0, 0., 0.0),(0.015, 0.0, 0.0),(0.125, 0., 0.),(0.375, 0., 0.),(0.625, 1., 1.),(0.875, 1., 1.),(1., 1., 1.)),
        'green':  ( (0.0, 0., 0.0),(0.015, 0.0, 0.0),(0.125, 0., 0.),(0.375, 1., 1.),(0.625, 1., 1.),(0.875, 0., 0.),(1., 1., 1.)),
        'blue' :  ( (0.0, 0., 0.0),(0.015, 0.0, 0.6),(0.125, 1., 1.),(0.375, 1., 1.),(0.625, 0., 0.),(0.875, 0., 0.),(1., 1., 1.))}
    cm_myjet = mpl.colors.LinearSegmentedColormap('my_jet', cdict_pcolor, 101) 
    x = mdates.date2num(data_time)
    tm = plt.pcolor(x, header, np.log10(data_pick_depo_ratio),norm=mpl.colors.SymLogNorm(linthresh=0.03, linscale=0.03,vmin=nrb_min, vmax=nrb_max),cmap=cm_myjet)#plt.cm.jet
    #ax2.set_ylim([0,alt])
    ax2.yaxis.grid(color='gray', alpha=0.3, linestyle='solid', linewidth=0.5)
    ax2.set_xlim(t1_date,data_time[-1])

    ax2.xaxis.set_major_locator(days)
    ax2.xaxis.set_major_formatter(dfmt)

    plt.ylabel('Height (km)',fontsize=labelsize) 
    #plt.gca().set_xlim([t1_date,plot_date])
    cax = fig.add_axes([0.91, 0.515, 0.015, 0.17])

    #plt.colorbar()
    tick_locations=[np.log10(0.001),np.log10(0.002),np.log10(0.003),np.log10(0.004),np.log10(0.005),np.log10(0.006),np.log10(0.007),np.log10(0.008),np.log10(0.009),np.log10(0.01),np.log10(0.02),np.log10(0.03),np.log10(0.04),np.log10(0.05),np.log10(0.06),np.log10(0.07),np.log10(0.08),np.log10(0.09),np.log10(0.1),np.log10(0.2),np.log10(0.3)]
    newlabels=['0.001',' ',' ',' ',' ',' ',' ',' ',' ','0.01',' ',' ',' ',' ',' ',' ',' ',' ','0.1',' ',' ']
    tick_locations=[np.log10(0.0001),np.log10(0.0002),np.log10(0.0003),np.log10(0.0004),np.log10(0.0005),np.log10(0.0006),np.log10(0.0007),np.log10(0.0008),np.log10(0.0009),np.log10(0.001),np.log10(0.002),np.log10(0.003),np.log10(0.004),np.log10(0.005),np.log10(0.006),np.log10(0.007),np.log10(0.008),np.log10(0.009),np.log10(0.01),np.log10(0.02),np.log10(0.03),np.log10(0.04),np.log10(0.05),np.log10(0.06),np.log10(0.07),np.log10(0.08),np.log10(0.09),np.log10(0.1)]
    newlabels=[' ',' ',' ',' ',' ',' ',' ',' ',' ','0.001',' ',' ',' ',' ',' ',' ',' ',' ','0.01',' ',' ',' ',' ',' ',' ',' ',' ','0.1']
    plt.colorbar(cax=cax,ticks=tick_locations).set_label(label= 'Depol', rotation=90,labelpad=10,fontsize=labelsize)
    #plt.setp(cax.get_yticklabels(), visible=False)
    cax.set_yticklabels(newlabels)#cb=plt.colorbar(extend='both')
    cax.tick_params(labelsize=ticksize)    

    for alt in alts :
        ax1.set_ylim([0,alt])
        ax2.set_ylim([0,alt])

        output_name1= i_site+'_'+t1+' to '+t2+'_1km.png'    
        output_file1 = './fig/'+output_name1
        #print'output_file',output_file1
        print'saving fig:',output_file1 ; print dt.datetime.now()
      
        plt.savefig(output_file1,dpi=100,bbox_inches='tight', format="png")
        #plt.savefig("plot.png", format="png")
        #shutil.copy2(output_file, output_file1) 
    plt.cla
    plt.close(fig)

if __name__ == "__main__":
    main() 
       