import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const RoleSelection = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-6">
      <Card className="max-w-lg w-full bg-white shadow-2xl rounded-2xl border border-gray-200">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-extrabold flex justify-center items-center gap-2 text-gray-900">
            <TrendingUp className="h-7 w-7 text-primary" />
            AIStock Pro
          </CardTitle>
          <CardDescription className="mt-2 text-gray-600 text-lg">
            Select your analysis mode
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-6 mt-4">
          {/* Past Analysis */}
          <Button
            className="w-full h-24 rounded-xl 
                       bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700
                       text-white text-xl font-bold tracking-wide
                       shadow-[0_4px_20px_rgba(59,130,246,0.5)]
                       hover:shadow-[0_6px_30px_rgba(59,130,246,0.7)]
                       hover:scale-[1.03] transition-all duration-300 ease-in-out
                       border border-blue-300/40"
            onClick={() => navigate("/dashboard")}
          >
            Past Analysis
          </Button>

          {/* Future Prediction */}
          <Button
            className="w-full h-24 rounded-xl 
                       bg-gradient-to-r from-purple-700 via-purple-600 to-pink-700
                       text-white text-xl font-bold tracking-wide
                       shadow-[0_4px_20px_rgba(168,85,247,0.5)]
                       hover:shadow-[0_6px_30px_rgba(168,85,247,0.7)]
                       hover:scale-[1.03] transition-all duration-300 ease-in-out
                       border border-purple-300/40"
            onClick={() => navigate("/prediction")}
          >
            Future Prediction
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoleSelection;
