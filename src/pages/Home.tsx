import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryCard } from "@/components/CategoryCard";
import { RequestCard } from "@/components/RequestCard";
import { SuggestedRequestCard } from "@/components/SuggestedRequestCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, MousePointerSquareDashed, Vote, Check } from "lucide-react";
import { useCategories, usePopularRequests, useRecentRequests, useTopSuggestedRequests } from "@/hooks/use-queries";
import { Skeleton } from "@/components/ui/skeleton";

export function HomePage() {
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: popularRequests = [], isLoading: popularLoading } = usePopularRequests();
  const { data: recentRequests = [], isLoading: recentLoading } = useRecentRequests();
  const { data: suggestedRequests = [], isLoading: suggestedLoading } = useTopSuggestedRequests();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <section className="mb-16">
        <div className="flex flex-col lg:flex-row gap-8 items-center">
          <div className="flex-1">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-serbia-blue">
              Građanski Zahtevi
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Platforma za građansko učešće u donošenju odluka i predlaganje zahteva od javnog interesa.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button size="lg" asChild>
                <Link to="/zahtevi">Pregledaj zahteve</Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/predlozi">Predloži ideju</Link>
              </Button>
            </div>
          </div>
          <div className="flex-1 flex justify-center">
            <img
              src="/hero-image.svg"
              alt="Ilustracija građanskog učešća"
              className="max-w-full h-auto max-h-80"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <FeatureCard
            icon={<Vote className="h-10 w-10 text-serbia-blue" />}
            title="Glasaj"
            description="Izrazite svoje mišljenje o različitim zahtevima i inicijativama."
          />
          <FeatureCard
            icon={<MousePointerSquareDashed className="h-10 w-10 text-serbia-blue" />}
            title="Predloži"
            description="Podnesite svoje ideje i predloge za unapređenje društva."
          />
          <FeatureCard
            icon={<Check className="h-10 w-10 text-serbia-blue" />}
            title="Prati napredak"
            description="Pratite realizaciju usvojenih zahteva i inicijativa."
          />
        </div>
      </section>

      {/* Categories Section */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Kategorije</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/kategorije" className="flex items-center gap-2">
              Sve kategorije
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64">
                <CardContent className="p-6 flex flex-col h-full">
                  <Skeleton className="h-10 w-10 rounded-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-1" />
                  <Skeleton className="h-4 w-4/6 mb-8" />
                  <div className="mt-auto flex justify-between">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.slice(0, 6).map((category) => (
              <CategoryCard
                key={category.id}
                id={category.id}
                name={category.title}
                description={category.description}
                slug={category.slug || category.id}
                icon={category.icon}
              />
            ))}
          </div>
        )}
      </section>

      {/* Requests Section */}
      <section className="mb-16">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Zahtevi</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/zahtevi" className="flex items-center gap-2">
              Svi zahtevi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="popular">
          <TabsList className="mb-6">
            <TabsTrigger value="popular">Popularni</TabsTrigger>
            <TabsTrigger value="recent">Najnoviji</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular">
            {popularLoading ? (
              <RequestsLoadingState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {popularRequests.slice(0, 4).map((request) => (
                  <RequestCard
                    key={request.id}
                    id={request.id}
                    title={request.title}
                    description={request.description}
                    slug={request.slug}
                    status={request.status}
                    commentCount={request.comment_count || 0}
                    voteCount={request.vote_count || 0}
                    createdAt={request.created_at}
                    deadline={request.deadline}
                    progress={request.progress}
                    categorySlug={request.category?.slug}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="recent">
            {recentLoading ? (
              <RequestsLoadingState />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {recentRequests.slice(0, 4).map((request) => (
                  <RequestCard
                    key={request.id}
                    id={request.id}
                    title={request.title}
                    description={request.description}
                    slug={request.slug}
                    status={request.status}
                    commentCount={request.comment_count || 0}
                    voteCount={request.vote_count || 0}
                    createdAt={request.created_at}
                    deadline={request.deadline}
                    progress={request.progress}
                    categorySlug={request.category?.slug}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Suggested Requests Section */}
      <section>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold">Predlozi građana</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/predlozi" className="flex items-center gap-2">
              Svi predlozi
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {suggestedLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-4" />
                  <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestedRequests.slice(0, 6).map((request) => (
              <SuggestedRequestCard
                key={request.id}
                id={request.id}
                title={request.title}
                description={request.description}
                voteCount={request.voteCount}
                userVote={request.user_vote}
                categories={request.categories}
                createdAt={request.created_at}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="border-2 border-gray-100">
      <CardContent className="p-6">
        <div className="mb-4">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

function RequestsLoadingState() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex justify-between mb-3">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            <Skeleton className="h-6 w-5/6 mb-2" />
            <Skeleton className="h-4 w-full mb-1" />
            <Skeleton className="h-4 w-5/6 mb-1" />
            <Skeleton className="h-4 w-4/6 mb-4" />
            <Skeleton className="h-2 w-full mb-6" />
            <div className="flex justify-between">
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
              <Skeleton className="h-6 w-28" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
} 