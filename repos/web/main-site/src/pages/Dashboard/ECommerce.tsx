import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";

import { createClient } from "@supabase/supabase-js";
import { useEffect } from 'react';

export default function Ecommerce() {

  const supabase = createClient(
    'https://fhgidcjliheaxdlzfmbx.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZ2lkY2psaWhlYXhkbHpmbWJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzk0OTA0NjUsImV4cCI6MjA1NTA2NjQ2NX0.g7y-wJ3WDC0liQC741Hoc27aaAUsni7GxSjXqIivEP8'
  );

  const email = 'heinrich.van.vught@gmail.com';
  const password = 'Password';

  useEffect(() => {
    async function loginUser() {
      const { data, error } = await supabase
      .auth
      .signInWithPassword( { email, password });
    }
    async function getProducts() {
      const { data, error } = await supabase
        .from('sampleproducts')
        .select('id, name, price, category')
        .eq("category", "electronics");

      if (error) {
        console.error('Supabase error:', error);
        return;
      }
      
      console.log('Query results:', {
        data,
        count: data?.length ?? 0,
        firstRecord: data?.[0]
      });
    }

    loginUser();
    getProducts();
  }, []);

  return (
    <>
      <PageMeta
        title="React.js Ecommerce Dashboard | TailAdmin - React.js Admin Dashboard Template"
        description="This is React.js Ecommerce Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template"
      />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-7">
          <EcommerceMetrics />

          <MonthlySalesChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <MonthlyTarget />
        </div>

        <div className="col-span-12">
          <StatisticsChart />
        </div>

        <div className="col-span-12 xl:col-span-5">
          <DemographicCard />
        </div>

        <div className="col-span-12 xl:col-span-7">
          <RecentOrders />
        </div>
      </div>
    </>
  );
}
