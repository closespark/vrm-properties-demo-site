import { notFound } from 'next/navigation';
import Image from 'next/image';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import HubSpotCTA from '@/components/HubSpotCTA';
import PropertyActionButtons from '@/components/PropertyActionButtons';
import PropertyInquiryForm from '@/components/PropertyInquiryForm';
import { getPropertyById, properties } from '@/data/properties';

export async function generateStaticParams() {
  return properties.map((property) => ({
    id: property.id,
  }));
}

export default async function PropertyDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  const property = getPropertyById(id);

  if (!property) {
    notFound();
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <>
      <Header />
      
      <main className="min-h-screen bg-gray-50">
        {/* Property Hero */}
        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Image */}
              <div className="relative h-96 lg:h-[600px] rounded-lg overflow-hidden">
                <Image
                  src={property.image}
                  alt={property.title}
                  fill
                  className="object-cover"
                  priority
                />
                {property.status !== 'available' && (
                  <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-md font-semibold uppercase">
                    {property.status === 'coming-soon' ? 'Coming Soon' : 'Sold'}
                  </div>
                )}
              </div>

              {/* Property Info */}
              <div>
                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {property.isNewListing && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      New Listing
                    </span>
                  )}
                  {property.isFeatured && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Featured
                    </span>
                  )}
                  {property.isVendeeFinancing && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-semibold">
                      VA Financing Available
                    </span>
                  )}
                  {property.isAuction && (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Auction
                    </span>
                  )}
                  {property.isOnlineAuction && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-semibold">
                      Online Auction
                    </span>
                  )}
                </div>

                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  {property.title}
                </h1>
                
                <p className="text-xl text-gray-600 mb-2">
                  {property.address}{property.addressLine2 ? `, ${property.addressLine2}` : ''}, {property.city}, {property.state} {property.zipCode}
                </p>
                {property.county && (
                  <p className="text-md text-gray-500 mb-6">
                    {property.county} County
                  </p>
                )}
                
                <div className="mb-4">
                  <div className="text-4xl font-bold text-blue-600">
                    {formatPrice(property.price)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {property.assetListingStatus}
                    {property.underContractDate && (
                      <span className="ml-2 text-orange-600">• Under Contract</span>
                    )}
                  </div>
                  {property.soldDate && property.salePrice && (
                    <div className="text-sm text-green-600 mt-1">
                      Sold on {new Date(property.soldDate).toLocaleDateString()} for {formatPrice(property.salePrice)}
                    </div>
                  )}
                </div>

                {/* Auction Details */}
                {property.isAuction && (
                  <div className="bg-red-50 p-4 rounded-lg mb-6">
                    <h3 className="font-semibold text-red-800 mb-2">Auction Details</h3>
                    {property.auctionStartDate && (
                      <p className="text-sm text-red-700">Start: {new Date(property.auctionStartDate).toLocaleString()}</p>
                    )}
                    {property.auctionEndDate && (
                      <p className="text-sm text-red-700">End: {new Date(property.auctionEndDate).toLocaleString()}</p>
                    )}
                    {property.highBid && (
                      <p className="text-lg font-bold text-red-800 mt-2">Current High Bid: {formatPrice(property.highBid)}</p>
                    )}
                  </div>
                )}
                
                {/* Features */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">{property.bedrooms}</div>
                    <div className="text-sm text-gray-600">Bedrooms</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <div className="text-2xl font-bold text-gray-900">{property.bathrooms}</div>
                    <div className="text-sm text-gray-600">Bathrooms</div>
                  </div>
                  {property.squareFeet && (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {property.squareFeet.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-600">Sq Ft</div>
                    </div>
                  )}
                  {property.lotSize && (
                    <div className="bg-gray-50 p-4 rounded-lg text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {property.lotSize}
                      </div>
                      <div className="text-sm text-gray-600">
                        Lot Size ({property.lotSizeSource || 'acres'})
                      </div>
                    </div>
                  )}
                </div>
                
                {/* HubSpot CTA */}
                <div className="mb-6">
                  <HubSpotCTA 
                    ctaId="YOUR_CTA_ID" 
                    portalId="YOUR_PORTAL_ID"
                  />
                </div>
                
                {/* Action Buttons */}
                <PropertyActionButtons />
              </div>
            </div>
          </div>
        </section>

        {/* Property Description */}
        <section className="bg-white mt-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Property Description</h2>
            <div className="prose max-w-none text-gray-600">
              <p className="mb-4">
                Welcome to this stunning {property.title.toLowerCase()} located in the heart of {property.city}, {property.state}. 
                This exceptional property offers {property.bedrooms} bedrooms and {property.bathrooms} bathrooms across 
                {property.squareFeet ? ` ${property.squareFeet.toLocaleString()} square feet` : ' a spacious layout'}.
              </p>
              <p className="mb-4">
                Perfect for vacation rentals or as a personal retreat, this property combines luxury amenities with 
                prime location. Whether you&apos;re looking for an investment opportunity or your dream vacation home, 
                this property delivers on all fronts.
              </p>
              <p>
                The property features modern finishes, high-end appliances, and stunning views. Located in a 
                sought-after neighborhood with easy access to local attractions, dining, and entertainment.
              </p>
            </div>
          </div>
        </section>

        {/* Amenities */}
        <section className="bg-gray-50 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Amenities</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                'Air Conditioning',
                'Heating',
                'Washer/Dryer',
                'Parking',
                'WiFi',
                'Kitchen',
                'Pool',
                'Hot Tub',
                'Gym',
                'Outdoor Space',
                'BBQ Grill',
                'Beach Access',
              ].map((amenity) => (
                <div key={amenity} className="flex items-center gap-2 bg-white p-3 rounded-lg">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-gray-700">{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form */}
        <section id="property-inquiry-form" className="bg-white py-12">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
              Interested in This Property?
            </h2>
            <p className="text-gray-600 text-center mb-8">
              Fill out the form below and our team will get back to you with more information
            </p>
            
            <div className="bg-gray-50 p-8 rounded-lg">
              <PropertyInquiryForm 
                portalId="YOUR_PORTAL_ID"
                formId="YOUR_PROPERTY_INQUIRY_FORM_ID"
              />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </>
  );
}
