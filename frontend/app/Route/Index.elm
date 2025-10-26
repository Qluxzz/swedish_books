module Route.Index exposing (ActionData, Data, Model, Msg, route)

import BackendTask exposing (BackendTask)
import BackendTask.Custom
import Book
import FatalError exposing (FatalError)
import Head
import Head.Seo as Seo
import Html
import Html.Attributes
import Json.Decode
import Json.Encode
import MimeType exposing (MimeText(..))
import Pages.Url
import PagesMsg exposing (PagesMsg)
import Route
import RouteBuilder exposing (App, StatelessRoute)
import Shared
import UrlPath
import View exposing (View)


type alias Model =
    {}


type alias Msg =
    ()


type alias RouteParams =
    {}


type alias Data =
    { ratedBooks : List Book.Book, unratedBooks : List Book.Book }


type alias ActionData =
    {}


route : StatelessRoute RouteParams Data ActionData
route =
    RouteBuilder.single
        { head = head
        , data = data
        }
        |> RouteBuilder.buildNoState { view = view }


data : BackendTask FatalError Data
data =
    BackendTask.map2
        (\rated unrated -> { ratedBooks = rated, unratedBooks = unrated })
        (BackendTask.Custom.run "getRatedTitles"
            Json.Encode.null
            (Json.Decode.list Book.decode)
            |> BackendTask.allowFatal
        )
        (BackendTask.Custom.run "getUnratedTitles"
            Json.Encode.null
            (Json.Decode.list Book.decode)
            |> BackendTask.allowFatal
        )


head :
    App Data ActionData RouteParams
    -> List Head.Tag
head app =
    Seo.summary
        { canonicalUrlOverride = Nothing
        , siteName = "Gömda böcker"
        , image =
            { url = [ "images", "icon-png.png" ] |> UrlPath.join |> Pages.Url.fromPath
            , alt = "elm-pages logo"
            , dimensions = Nothing
            , mimeType = Nothing
            }
        , description = "Welcome to elm-pages!"
        , locale = Nothing
        , title = "elm-pages is running"
        }
        |> Seo.website


view :
    App Data ActionData RouteParams
    -> Shared.Model
    -> View (PagesMsg Msg)
view app shared =
    { title = "Gömda böcker"
    , body =
        [ Html.header []
            [ Html.h1 [] [ Html.text "Glömda böcker" ]
            , Html.p [] [ Html.text "Svenska verk från bibliotekets magasin" ]
            ]
        , Html.main_ []
            [ Html.div [ Html.Attributes.class "container" ]
                [ Html.section [ Html.Attributes.class "section" ]
                    [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Betygsatta Fynd" ]
                    , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Dessa sällsynta verk har lästs av några få. Varje bok bär spår av tiden och väntar på att återupptäckas." ]
                    , Html.div [ Html.Attributes.class "book-grid" ] (List.map Book.view app.data.ratedBooks)
                    ]
                , Html.section [ Html.Attributes.class "section" ]
                    [ Html.h2 [ Html.Attributes.class "section-title" ] [ Html.text "Mysterierna" ]
                    , Html.p [ Html.Attributes.class "section-description" ] [ Html.text "Böcker utan betyg. Deras historia är oklar, men de väntar på att bli utforskade." ]
                    , Html.div [ Html.Attributes.class "book-grid" ] (List.map Book.view app.data.unratedBooks)
                    ]
                ]
            ]
        , Html.footer []
            [ Html.div [ Html.Attributes.class "container" ]
                [ Html.p [] [ Html.text "En samling av glömda svenska litterära skatter" ]
                ]
            ]
        ]
    }
