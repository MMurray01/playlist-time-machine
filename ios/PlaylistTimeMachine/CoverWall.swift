import SwiftUI

/// Dimmed album-cover wall behind the year picker, in the same spirit as the website landing page.
struct CoverWall: View {
    private let paper = Color(red: 246 / 255, green: 246 / 255, blue: 247 / 255)

    var body: some View {
        GeometryReader { proxy in
            mosaic(in: proxy.size)
                .fixedSize(horizontal: false, vertical: true)
                .frame(width: proxy.size.width, height: proxy.size.height, alignment: .center)
                .clipped()
        }
        .overlay { scrim }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }

    private func mosaic(in size: CGSize) -> some View {
        let columns = 3
        let spacing: CGFloat = 10
        let side = (size.width + 36 - spacing * CGFloat(columns - 1)) / CGFloat(columns)
        let urls = CoverWallCatalog.urls
        let rowCount = Int(ceil(Double(urls.count) / Double(columns)))
        return VStack(spacing: spacing) {
            ForEach(0..<rowCount, id: \.self) { row in
                HStack(spacing: spacing) {
                    ForEach(0..<columns, id: \.self) { column in
                        let index = row * columns + column
                        if index < urls.count {
                            AsyncImage(url: urls[index]) { phase in
                                switch phase {
                                case .success(let image):
                                    image.resizable().scaledToFill()
                                default:
                                    Theme.cover
                                }
                            }
                            .frame(width: side, height: side)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                        }
                    }
                }
            }
        }
        .padding(12)
    }

    private var scrim: some View {
        ZStack {
            paper.opacity(0.42)
            LinearGradient(
                colors: [
                    paper.opacity(0.62),
                    paper.opacity(0.18),
                    paper.opacity(0.18),
                    paper.opacity(0.94),
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            LinearGradient(
                colors: [
                    paper.opacity(0.2),
                    paper.opacity(0.82),
                    paper.opacity(0.97),
                    paper.opacity(0.82),
                    paper.opacity(0.2),
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        }
    }
}

enum CoverWallCatalog {
    static let urls: [URL] = [
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/d1/8e/eb/d18eebcc-195c-c148-bd74-1920ac9a0638/mzi.vdnjgskg.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/2f/ec/dd/2fecdd59-1ca1-47c1-a945-2969eb0d347b/888880280336.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/57/6a/a6/576aa6f7-3b8a-63eb-358c-2b4fd80fdb88/8718522456299.png/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/5a/d6/3c/mzi.gkdvgkge.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/53/e5/0f/53e50f07-fb36-7de3-8971-a93fbea5fafc/825646281343.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/c5/33/dc/c533dc8e-2baa-94f9-22be-e6e28945f932/075679754134.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/8d/d8/f7/8dd8f70a-e345-3483-67e9-4c618a39d39c/00077778606956.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Features/e3/2a/76/dj.xxlrpxcu.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/2f/0b/25/2f0b252d-838e-4f19-3c08-91e49b269564/15UMGIM18445.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/bc/13/27/bc13275c-8b26-802d-771b-d15ae00fb530/mzm.hvpwjsvi.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/4c/33/3e/4c333e8d-8f6e-c661-531a-f241231074f4/mzi.ircnuisz.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/b2/b4/9b/b2b49bf4-49ce-b454-17a4-15fab0e7e535/027779021128.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/af/eb/f9/mzi.fullnztf.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/f5/24/f3/f524f326-48dc-25e1-562d-d1d13e6e45d5/074644798227.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music123/v4/1c/46/da/1c46da55-6dff-2c58-837e-bdd419ff9ca8/093624759829.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/v4/b6/6c/35/b66c351f-0fb2-55a2-c758-0e349fb62662/01._The_Tokens_-_The_Lion_Sleeps_Tonight.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/83/e1/02/83e102bb-b5b8-78ea-10ce-8f210211a9a8/603497889945.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/54/28/14/54281424-eece-0935-299d-fdd2ab403f92/24UM1IM28978.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/6c/71/c1/6c71c1b9-fe4a-bc01-f210-cd47ecae331a/mzi.lotdcyoz.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/05/8d/99/058d99fd-36e9-6445-d402-4104d5148985/15UMGIM14572.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Features125/v4/6f/0e/ea/6f0eea99-e8f4-1e0d-f5de-ffc990c8da92/dj.bquaoulm.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/a7/4b/6f/a74b6f46-7648-eda6-2b27-bb3ec5edd215/603497848171.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/dc/05/d7/mzi.fnsjtrdf.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/78/8f/01/788f014e-8992-a2da-cca8-519b7c62ff87/mzi.apuydatc.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/08/ee/da/08eeda1f-d44d-aec1-ec9d-0c5b9f8c8536/602527717524.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/30/05/1e/30051e57-a63a-3acc-4b30-42568293f5f7/15UMGIM36514.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/6a/59/06/6a590611-567b-0b07-43ed-11ed830da08c/715187729629.png/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/52/ed/f3/52edf3b6-5b73-c52d-e3f6-4473412eec7c/886443406193.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/85/62/4d/85624d3c-2984-b23d-b7b4-a7564df58e7b/mzi.evaurgvc.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/cb/6e/a7/cb6ea70a-6cb8-89a0-4da7-91e2d04a7bba/08PNDIM05386.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/04/ab/25/04ab2585-dd7b-dfed-3afe-86800393a7c2/13ULAIM48853.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/a9/32/e4/mzi.iyvuqtop.tif/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/88/c6/c1/88c6c1d0-2951-fc56-0006-89cf36d6b3bb/mzi.kavhkzgu.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music127/v4/d6/66/f8/d666f8a9-b93d-10ef-c7bf-990423b51ae3/888880129208.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/fd/1d/93/fd1d938a-095f-31b3-dfa7-7c62ab847f95/06UMGIM72115.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music128/v4/43/d7/b4/43d7b435-719d-d9df-7c8d-904113e949cc/00602537945160.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music118/v4/8c/45/7d/8c457ddb-685c-ea0a-9d39-190a5e7e0e03/00602537386840.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/81/29/ad/8129ad53-c26f-4ced-3aa1-6ea313e298af/artwork.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/03/b0/e2/03b0e211-be78-5e79-815b-dc2961e40f40/13UABIM53820.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/83/56/3c/83563c70-437e-af42-4327-32842b34d467/00602537669042.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/62/61/61/626161c0-f4d7-e6ff-8586-768340ef278f/00602537002382.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/17/f9/54/17f954b3-1957-6994-a8a3-879dac41c1c3/196872779868.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/b8/5e/16/b85e1612-0b86-efe5-d6e2-a53a7244e558/mzi.xsnqpqgt.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/2d/12/aa/2d12aa24-1a0e-f177-84c1-8ffd06bbe495/06UMGIM52004.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/8a/60/e3/8a60e389-06f5-b075-4ae9-f3e77e583b13/00602567822059.rgb.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/d2/2d/6b/d22d6b0f-68dd-0eeb-92b4-9b6f4a43e85f/886448047452.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music/y2003/m12/d19/h03/s05.undsbuju.jpg/200x200bb.jpg")!,
        URL(string: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/c0/df/52/c0df5249-3b2d-f15f-6e88-8653c37499c5/00602537669011.rgb.jpg/200x200bb.jpg")!,
    ]
}
