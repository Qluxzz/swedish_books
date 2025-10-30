module Route.Index exposing (ActionData, Data, Model, Msg, route)

import BackendTask exposing (BackendTask)
import BackendTask.Custom
import Book
import BookList exposing (view)
import FatalError exposing (FatalError)
import Head
import Head.Seo as Seo
import Json.Decode
import Json.Encode
import LanguageTag.Language
import LanguageTag.Region
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
    BackendTask.Custom.run "getHomePageData"
        Json.Encode.null
        (Json.Decode.map2 Data
            (Json.Decode.field "ratedTitles" (Json.Decode.list Book.decode))
            (Json.Decode.field "unratedTitles" (Json.Decode.list Book.decode))
        )
        |> BackendTask.allowFatal


head :
    App Data ActionData RouteParams
    -> List Head.Tag
head _ =
    Seo.summary
        { canonicalUrlOverride = Nothing
        , siteName = "Mindre kända Svenska originalverk"
        , image =
            { url = [ "images", "icon-png.png" ] |> UrlPath.join |> Pages.Url.fromPath
            , alt = "elm-pages logo"
            , dimensions = Nothing
            , mimeType = Nothing
            }
        , description = "Hitta svenska skönlitterära originalverk som många kanske inte känner till"
        , locale = Just ( LanguageTag.Language.sv, LanguageTag.Region.se )
        , title = "Mindre kända Svenska originalverk"
        }
        |> Seo.website


view :
    App Data ActionData RouteParams
    -> Shared.Model
    -> View (PagesMsg Msg)
view app _ =
    { title = "Mindre kända Svenska originalverk"
    , body =
        BookList.view { linkToAuthor = True, linkToYear = True } app.data.ratedBooks app.data.unratedBooks
    }
