import { Badge } from "@/components/ui/badge";

export default function Testimonials() {
  const reviews = [
    {
      name: "Shraddha Mishra",
      linkedin: "https://www.linkedin.com/in/shraddhaamishra/",
      instagram: "#", // To be updated
      review: "UNiSO's collaborative features made our dev process seamless. The community aspect is truly unique!",
      gradientClass: "bg-gradient-card-1"
    },
    {
      name: "Arnav Bhardwaj",
      linkedin: "https://www.linkedin.com/in/arnav-bhardwaj-241808248/",
      instagram: "#", // To be updated
      review: "Loved building UNiSO! The platform is robust and the feedback from users has been amazing.",
      gradientClass: "bg-gradient-card-2"
    },
    {
      name: "Aditya Kaushik",
      linkedin: "https://www.linkedin.com/in/aditya-kaushik05/",
      instagram: "#", // To be updated
      review: "UNiSO is a game-changer for student networking. Proud to be part of the dev team!",
      gradientClass: "bg-gradient-card-3"
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Decorative elements */}
        <div className="absolute top-1/2 left-0 w-40 h-40 bg-lime/10 rounded-full -z-10 transform -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-60 h-60 bg-primary/10 rounded-full -z-10 transform translate-x-1/4 translate-y-1/4"></div>
        
        <div className="text-center mb-10">
          <Badge variant="secondary" className="mb-4 px-4 py-1 text-sm rounded-full bg-accent/20 text-accent border-0">
            Developer Reviews
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 font-poppins">
            What the <span className="text-accent">developers</span> are saying
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
            Meet the minds behind UNiSO and see what they think about building the platform.
          </p>
        </div>

        <div className="grid gap-10 md:grid-cols-3">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-white rounded-3xl shadow-xl overflow-hidden hover-lift transition-all"
            >
              {/* Card header with gradient */}
              <div className={`${review.gradientClass} h-24 p-6 flex items-end`}>
                <div className="h-16 w-16 rounded-full border-4 border-white bg-gray-200 flex items-center justify-center text-xl font-bold text-gray-600 translate-y-8">
                  {review.name.split(' ').map(n => n[0]).join('')}
                </div>
              </div>
              {/* Content */}
              <div className="p-6 pt-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg flex items-center">
                      {review.name}
                      <a href={review.linkedin} target="_blank" rel="noopener noreferrer" className="ml-2">
                        <img src="/images/linkedin.svg" alt="LinkedIn" className="w-5 h-5 inline" />
                      </a>
                      <a href={review.instagram} target="_blank" rel="noopener noreferrer" className="ml-2">
                        <img src="/images/instagram.svg" alt="Instagram" className="w-5 h-5 inline" />
                      </a>
                    </h3>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                  <p className="text-gray-700">
                    {review.review}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Developer Review</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Show more testimonials section */}
        <div className="mt-14 text-center">
          <p className="text-primary mb-6 inline-flex items-center">
            <span className="emoji-pop">👋</span>
            <span className="mx-2">Join thousands of students already on UNiSO</span>
            <span className="emoji-pop">👋</span>
          </p>
          <a 
            href="#" 
            className="inline-flex items-center px-6 py-3 bg-gray-100 hover:bg-gray-200 transition-colors rounded-full text-gray-800 font-medium"
          >
            See more student stories
          </a>
        </div>
      </div>
    </section>
  );
}
