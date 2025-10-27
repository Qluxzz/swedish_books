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
head _ =
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
        , locale = Just ( LanguageTag.Language.sv, LanguageTag.Region.se )
        , title = "Gömda böcker"
        }
        |> Seo.website


view :
    App Data ActionData RouteParams
    -> Shared.Model
    -> View (PagesMsg Msg)
view app _ =
    { title = "Gömda böcker"
    , body =
        BookList.view True app.data.ratedBooks app.data.unratedBooks
    }
